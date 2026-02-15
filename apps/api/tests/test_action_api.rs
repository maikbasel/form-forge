mod test_utils;

#[cfg(test)]
#[cfg(target_os = "linux")] // Requires Docker and Linux containers - only runs on ubuntu-latest GitHub runners
mod tests {
    use crate::test_utils;
    use crate::test_utils::{
        AsyncTestContext, read_document_javascript, read_field_calculation_js,
    };
    use actions_core::ports::driving::ActionService;
    use actions_pdf::adapter::PdfActionAdapter;
    use actions_web::handler::{
        AttachAbilityModCalcScriptRequest, AttachSavingThrowModifierCalculationScriptRequest,
        AttachSkillModifierCalculationScriptRequest, attach_ability_modifier_calculation_script,
        attach_saving_throw_modifier_calculation_script, attach_skill_modifier_calculation_script,
    };
    use actix_web::http::StatusCode;
    use actix_web::test;
    use common_telemetry as telemetry;
    use pretty_assertions::assert_eq;
    use rstest::*;
    use sheets_core::ports::driven::{SheetPdfPort, SheetReferencePort, SheetStoragePort};
    use sheets_core::ports::driving::SheetService;
    use sheets_db::adapter::SheetReferenceDb;
    use sheets_pdf::adapter::SheetsPdf;
    use sheets_s3::adapter::SheetS3Storage;
    use sheets_web::handler::{
        DownloadSheetResponse, UploadSheetResponse, download_sheet, upload_sheet,
    };
    use std::sync::Arc;

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
            Arc::new(SheetReferenceDb::new(async_ctx.pool.clone()));
        let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);
        let s3_storage: Arc<SheetS3Storage> = async_ctx.s3_storage;
        let storage_port: Arc<dyn SheetStoragePort> = s3_storage.clone();
        let sheet_service = SheetService::new(sheet_pdf_port, storage_port, reference_port.clone());
        let action_storage_port: Arc<dyn actions_core::ports::driven::SheetStoragePort> =
            s3_storage.clone();
        let action_reference_port: Arc<dyn actions_core::ports::driven::SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool));
        let action_pdf_port: Arc<dyn actions_core::ports::driven::ActionPdfPort> =
            Arc::new(PdfActionAdapter);
        let action_service =
            ActionService::new(action_reference_port, action_storage_port, action_pdf_port);
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(app_data: [sheet_service, action_service], services: [upload_sheet, attach_ability_modifier_calculation_script, download_sheet]);
        let expected_js = include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../crates/actions_core/js/dnd-helpers.js"
        ));
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
            .uri(&format!("/dnd5e/{}/ability-modifier", sheet_id))
            .set_json(AttachAbilityModCalcScriptRequest::new("STR", "STRmod"))
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::NO_CONTENT);
        //endregion

        //region Download updated sheet
        let download_req = test::TestRequest::get()
            .uri(&format!("/sheets/{}", sheet_id))
            .to_request();
        let download_resp: DownloadSheetResponse =
            test::call_and_read_body_json(&app, download_req).await;
        // S3 storage returns presigned HTTP URLs
        assert!(download_resp.url.starts_with("http://"));

        // Fetch PDF from storage to verify content
        let sheet_ref = reference_port
            .find_by_id(&sheet_id)
            .await
            .expect("get sheet reference");
        let pdf_path = <SheetS3Storage as SheetStoragePort>::read(&s3_storage, sheet_ref.path)
            .await
            .expect("read PDF from S3");
        //endregion

        //region Verify calc script attachment
        let actual_doc_level_js = read_document_javascript(&pdf_path);
        assert_eq!(actual_doc_level_js.len(), 1);
        assert_eq!(actual_doc_level_js[0].0, "HelpersJS");
        assert_eq!(actual_doc_level_js[0].1, expected_js);
        //endregion
        //region Verify field calculation action
        let actual_field_calc_js = read_field_calculation_js(&pdf_path, "STRmod");
        assert_eq!(
            actual_field_calc_js,
            r#"calculateModifierFromScore("STR");"#
        );
        //endregion
    }

    #[rstest]
    #[actix_web::test]
    async fn test_should_attach_dnd5e_saving_throw_modifier_calc_script_to_uploaded_sheet(
        #[future] async_ctx: AsyncTestContext,
    ) {
        //region Setup
        let async_ctx = async_ctx.await;
        let reference_port: Arc<dyn SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool.clone()));
        let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);
        let s3_storage: Arc<SheetS3Storage> = async_ctx.s3_storage;
        let storage_port: Arc<dyn SheetStoragePort> = s3_storage.clone();
        let sheet_service = SheetService::new(sheet_pdf_port, storage_port, reference_port.clone());
        let action_storage_port: Arc<dyn actions_core::ports::driven::SheetStoragePort> =
            s3_storage.clone();
        let action_reference_port: Arc<dyn actions_core::ports::driven::SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool));
        let action_pdf_port: Arc<dyn actions_core::ports::driven::ActionPdfPort> =
            Arc::new(PdfActionAdapter);
        let action_service =
            ActionService::new(action_reference_port, action_storage_port, action_pdf_port);
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(app_data: [sheet_service, action_service], services: [upload_sheet, attach_saving_throw_modifier_calculation_script, download_sheet]);
        let expected_js = include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../crates/actions_core/js/dnd-helpers.js"
        ));
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

        //region Attach saving throw mod calc script
        let req = test::TestRequest::put()
            .uri(&format!("/dnd5e/{}/saving-throw-modifier", sheet_id))
            .set_json(AttachSavingThrowModifierCalculationScriptRequest::new(
                "STRmod",
                "Check Box 11",
                "ProfBonus",
                "ST Strength",
            ))
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::NO_CONTENT);
        //endregion

        //region Download updated sheet
        let download_req = test::TestRequest::get()
            .uri(&format!("/sheets/{}", sheet_id))
            .to_request();
        let download_resp: DownloadSheetResponse =
            test::call_and_read_body_json(&app, download_req).await;
        // S3 storage returns presigned HTTP URLs
        assert!(download_resp.url.starts_with("http://"));

        // Fetch PDF from storage to verify content
        let sheet_ref = reference_port
            .find_by_id(&sheet_id)
            .await
            .expect("get sheet reference");
        let pdf_path = <SheetS3Storage as SheetStoragePort>::read(&s3_storage, sheet_ref.path)
            .await
            .expect("read PDF from S3");
        //endregion

        //region Verify calc script attachment
        let actual_doc_level_js = read_document_javascript(&pdf_path);
        assert_eq!(actual_doc_level_js.len(), 1);
        assert_eq!(actual_doc_level_js[0].0, "HelpersJS");
        assert_eq!(actual_doc_level_js[0].1, expected_js);
        //endregion
        //region Verify field calculation action
        let actual_field_calc_js = read_field_calculation_js(&pdf_path, "ST Strength");
        assert_eq!(
            actual_field_calc_js,
            r#"calculateSaveFromFields("STRmod", "Check Box 11", "ProfBonus");"#
        );
        //endregion
    }

    #[rstest]
    #[actix_web::test]
    async fn test_should_attach_dnd5e_skill_modifier_calc_script_to_uploaded_sheet(
        #[future] async_ctx: AsyncTestContext,
    ) {
        //region Setup
        let async_ctx = async_ctx.await;
        let reference_port: Arc<dyn SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool.clone()));
        let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);
        let s3_storage: Arc<SheetS3Storage> = async_ctx.s3_storage;
        let storage_port: Arc<dyn SheetStoragePort> = s3_storage.clone();
        let sheet_service = SheetService::new(sheet_pdf_port, storage_port, reference_port.clone());
        let action_storage_port: Arc<dyn actions_core::ports::driven::SheetStoragePort> =
            s3_storage.clone();
        let action_reference_port: Arc<dyn actions_core::ports::driven::SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool));
        let action_pdf_port: Arc<dyn actions_core::ports::driven::ActionPdfPort> =
            Arc::new(PdfActionAdapter);
        let action_service =
            ActionService::new(action_reference_port, action_storage_port, action_pdf_port);
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(app_data: [sheet_service, action_service], services: [upload_sheet, attach_skill_modifier_calculation_script, download_sheet]);
        let expected_js = include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../crates/actions_core/js/dnd-helpers.js"
        ));
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

        //region Attach saving throw mod calc script
        let req = test::TestRequest::put()
            .uri(&format!("/dnd5e/{}/skill-modifier", sheet_id))
            .set_json(
                AttachSkillModifierCalculationScriptRequest::builder(
                    "STRmod",
                    "Check Box 26",
                    "ProfBonus",
                    "Athletics",
                )
                .build(),
            )
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::NO_CONTENT);
        //endregion

        //region Download updated sheet
        let download_req = test::TestRequest::get()
            .uri(&format!("/sheets/{}", sheet_id))
            .to_request();
        let download_resp: DownloadSheetResponse =
            test::call_and_read_body_json(&app, download_req).await;
        // S3 storage returns presigned HTTP URLs
        assert!(download_resp.url.starts_with("http://"));

        // Fetch PDF from storage to verify content
        let sheet_ref = reference_port
            .find_by_id(&sheet_id)
            .await
            .expect("get sheet reference");
        let pdf_path = <SheetS3Storage as SheetStoragePort>::read(&s3_storage, sheet_ref.path)
            .await
            .expect("read PDF from S3");
        //endregion

        //region Verify calc script attachment
        let actual_doc_level_js = read_document_javascript(&pdf_path);
        assert_eq!(actual_doc_level_js.len(), 1);
        assert_eq!(actual_doc_level_js[0].0, "HelpersJS");
        assert_eq!(actual_doc_level_js[0].1, expected_js);
        //endregion
        //region Verify field calculation action
        let actual_field_calc_js = read_field_calculation_js(&pdf_path, "Athletics");
        assert_eq!(
            actual_field_calc_js,
            r#"calculateSkillFromFields("STRmod", "Check Box 26", undefined, undefined, "ProfBonus");"#
        );
        //endregion
    }
}
