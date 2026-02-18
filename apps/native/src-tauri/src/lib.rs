use actions_core::action::CalculationAction;
use actions_core::ports::driving::ActionService;
use actions_pdf::adapter::PdfActionAdapter;
use sheets_core::ports::driven::{SheetPdfPort, SheetReferencePort, SheetStoragePort};
use sheets_core::ports::driving::SheetService;
use sheets_core::sheet::{Sheet, SheetField};
use sheets_fs::adapter::SheetFsStorage;
use sheets_libsql::adapter::SheetReferenceLibSql;
use sheets_pdf::adapter::SheetsPdf;
use std::sync::Arc;
use tauri::Manager;
use uuid::Uuid;

#[derive(Clone, serde::Serialize)]
struct SheetReferenceResponse {
    id: Uuid,
    original_name: String,
}

#[derive(Clone, serde::Serialize)]
struct SheetFieldResponse {
    name: String,
}

#[derive(Clone, serde::Serialize)]
struct ExportSheetResponse {
    path: String,
    filename: String,
}

#[tauri::command]
async fn upload_sheet(
    file_path: String,
    file_name: String,
    sheet_service: tauri::State<'_, SheetService>,
) -> Result<SheetReferenceResponse, String> {
    let sheet = Sheet::new(file_path.into(), Some(file_name));
    let sheet_ref = sheet_service
        .import_sheet(sheet)
        .await
        .map_err(|e| e.to_string())?;

    Ok(SheetReferenceResponse {
        id: sheet_ref.id,
        original_name: sheet_ref.original_name,
    })
}

#[tauri::command]
async fn get_sheet_form_fields(
    sheet_id: String,
    sheet_service: tauri::State<'_, SheetService>,
) -> Result<Vec<SheetFieldResponse>, String> {
    let id = Uuid::parse_str(&sheet_id).map_err(|e| e.to_string())?;
    let fields: Vec<SheetField> = sheet_service
        .list_sheet_form_fields(id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(fields
        .into_iter()
        .map(|f| SheetFieldResponse { name: f.name })
        .collect())
}

#[tauri::command]
async fn export_sheet(
    sheet_id: String,
    sheet_service: tauri::State<'_, SheetService>,
) -> Result<ExportSheetResponse, String> {
    let id = Uuid::parse_str(&sheet_id).map_err(|e| e.to_string())?;
    let sheet = sheet_service
        .export_sheet(id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(ExportSheetResponse {
        path: sheet.path.display().to_string(),
        filename: sheet.name.unwrap_or_default(),
    })
}

#[tauri::command]
async fn read_pdf_bytes(file_path: String) -> Result<tauri::ipc::Response, String> {
    let bytes = tokio::fs::read(&file_path)
        .await
        .map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
async fn attach_calculation_action(
    sheet_id: String,
    action: CalculationAction,
    action_service: tauri::State<'_, ActionService>,
) -> Result<(), String> {
    let id = Uuid::parse_str(&sheet_id).map_err(|e| e.to_string())?;
    action_service
        .attach_calculation_script(&id, action)
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("app data dir");

            // Initialize telemetry
            common_telemetry::initialize().expect("initialize telemetry");

            // Build adapters
            let sheet_fs_storage = Arc::new(SheetFsStorage::new(app_data_dir.join("sheets")));
            let sheet_reference_db = tauri::async_runtime::block_on(async {
                Arc::new(
                    SheetReferenceLibSql::new(app_data_dir.join("form-forge.db"))
                        .await
                        .expect("initialize libsql database"),
                )
            });
            let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);

            // Compose SheetService
            let sheet_storage_port: Arc<dyn SheetStoragePort> = sheet_fs_storage.clone();
            let sheet_reference_port: Arc<dyn SheetReferencePort> = sheet_reference_db.clone();
            let sheet_service =
                SheetService::new(sheet_pdf_port, sheet_storage_port, sheet_reference_port);

            // Compose ActionService
            let action_storage_port: Arc<dyn actions_core::ports::driven::SheetStoragePort> =
                sheet_fs_storage;
            let action_reference_port: Arc<dyn actions_core::ports::driven::SheetReferencePort> =
                sheet_reference_db;
            let action_pdf_port: Arc<dyn actions_core::ports::driven::ActionPdfPort> =
                Arc::new(PdfActionAdapter);
            let action_service =
                ActionService::new(action_reference_port, action_storage_port, action_pdf_port);

            // Store in managed state
            app.manage(sheet_service);
            app.manage(action_service);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            upload_sheet,
            get_sheet_form_fields,
            export_sheet,
            attach_calculation_action,
            read_pdf_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
