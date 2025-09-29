mod test_utils;

#[cfg(test)]
#[cfg(target_os = "linux")] // Requires Docker and Linux containers - only runs on ubuntu-latest GitHub runners
mod tests {
    use crate::test_utils;
    use crate::test_utils::AsyncTestContext;
    use actions_web::handler::{
        AttachAbilityModCalcScriptRequest, attach_ability_modifier_calculation_script,
    };
    use actix_web::http::StatusCode;
    use actix_web::test;
    use common::telemetry;
    use pdf_extract::extract_text;
    use pretty_assertions::assert_eq;
    use rstest::*;
    use sheets_core::ports::driven::{SheetPdfPort, SheetReferencePort, SheetStoragePort};
    use sheets_core::ports::driving::SheetService;
    use sheets_db::adapter::SheetReferenceDb;
    use sheets_pdf::adapter::SheetsPdf;
    use sheets_storage::adapter::SheetFileStorage;
    use sheets_storage::config::StorageConfig;
    use sheets_web::handler::{UploadSheetResponse, download_sheet, upload_sheet};
    use std::sync::Arc;
    use tempfile::Builder;

    #[fixture]
    async fn async_ctx() -> AsyncTestContext {
        AsyncTestContext::setup().await
    }

    #[rstest]
    #[actix_web::test]
    async fn test_should_attach_dnd5e_ability_modifier_calc_script_to_uploaded_sheet(
        #[future] async_ctx: AsyncTestContext,
    ) {
        //region Setup
        let async_ctx = async_ctx.await;
        let reference_port: Arc<dyn SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool));
        let tmp_dir = Builder::new()
            .prefix("tests")
            .tempdir()
            .expect("create temp dir");
        let storage_cfg = StorageConfig {
            data_dir: tmp_dir.path().to_path_buf(),
        };
        let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);
        let storage_port: Arc<dyn SheetStoragePort> =
            Arc::new(SheetFileStorage::new(storage_cfg.clone()));
        let sheet_service = SheetService::new(sheet_pdf_port, storage_port, reference_port);
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(app_data: [sheet_service], services: [upload_sheet, attach_ability_modifier_calculation_script, download_sheet]);
        //endregion

        //region Sheet upload
        let (multipart_header, multipart_body) =
            test_utils::dnd5e_sheet_multipart_form_data().build();
        let upload_req = test::TestRequest::post()
            .uri("/sheets")
            .insert_header(multipart_header)
            .set_payload(multipart_body)
            .to_request();
        let upload_resp: UploadSheetResponse =
            test::call_and_read_body_json(&app, upload_req).await;
        let sheet_id = upload_resp.id;
        //endregion

        //region Attach ability mod calc script
        let req = test::TestRequest::put()
            .uri(&format!("/dnd/5e/{}/ability-modifier", sheet_id))
            .set_json(AttachAbilityModCalcScriptRequest::new(
                "int_score",
                "int_mod",
            ))
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::NO_CONTENT);
        //endregion

        //region Download updated sheet
        let download_req = test::TestRequest::get()
            .uri(&format!("/sheets/{}", sheet_id))
            .to_request();
        let download_resp = test::call_service(&app, download_req).await;
        let body_bytes = test::read_body(download_resp).await;
        let temp_pdf = Builder::new()
            .suffix(".pdf")
            .tempfile()
            .expect("create temp PDF file");
        std::fs::write(&temp_pdf.path(), &body_bytes).expect("write PDF to temp file");
        //endregion

        //region Verify calc script attachment
        let pdf_content = extract_text(&temp_pdf.path()).expect("extract PDF content");
        assert!(
            pdf_content.contains("DND.abilityMod(\"int_score\")")
                || pdf_content.contains("DND.abilityMod('int_score')")
        );
        //endregion
    }
}
