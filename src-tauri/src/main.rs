#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;

#[tauri::command]
fn legendary_list_games() -> Result<String, String> {
    let output = Command::new("../src-tauri/bin/legendary.exe")
        .arg("list-games")
        .arg("--json")
        .output()
        .map_err(|e| format!("Erro ao executar legendary: {}", e))?;

    if !output.status.success() {
        return Err("Legendary retornou erro".into());
    }

    let result = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(result)
}

#[tauri::command]
fn legendary_list_installed() -> Result<String, String> {
    let output = Command::new("../src-tauri/bin/legendary.exe")
        .arg("list-installed")
        .arg("--json")
        .output()
        .map_err(|e| format!("Erro ao executar legendary: {}", e))?;

    let result = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(result)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            legendary_list_games,
            legendary_list_installed
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
