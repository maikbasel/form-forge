use actix_web::web;

mod handlers;
mod request;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route(
        "/sheets",
        web::post().to(handlers::upload_sheet_and_bindings),
    )
        .route("/sheets/{id}",
        web::get().to(handlers::download_sheet));
}
