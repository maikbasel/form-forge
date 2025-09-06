use actix_web::web;

mod error;
mod handler;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route("/sheets", web::post().to(handler::upload_sheet))
        .route("/sheets/{id}", web::get().to(handler::download_sheet));
}
