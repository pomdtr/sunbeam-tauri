#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    fix_path_env::fix().expect("failed to fix PATH environment variable");
    tauri::Builder::default()
        .setup(|app| {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory); // Disable the icon in the dock
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
