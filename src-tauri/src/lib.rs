// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{path::BaseDirectory, AppHandle, Manager};

mod icon;

/// Builds a command for a console tool without flashing a console window.
fn quiet_command(program: &str) -> std::process::Command {
    #[allow(unused_mut)]
    let mut cmd = std::process::Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

fn runner_resource_name() -> &'static str {
    #[cfg(target_os = "windows")]
    let runner_name = "data/src-win.exe";

    #[cfg(target_os = "linux")]
    let runner_name = "data/src-linux";

    #[cfg(target_os = "macos")]
    let runner_name = "data/src-darwin";

    runner_name
}

fn is_app_bundle(executable_name: &str) -> bool {
    cfg!(target_os = "macos") && executable_name.ends_with(".app")
}

fn bundle_binary_name(app_name: &str) -> String {
    app_name
        .strip_suffix(".app")
        .unwrap_or(app_name)
        .to_string()
}

/// Accepts only plain relative names ("win64/game.exe"): no `..`, no drive or
/// root, no empty parts. Names come from Discord's public game list, so they
/// are untrusted and must never reach outside the `games` folder.
fn ensure_plain_relative(label: &str, value: &str) -> Result<(), String> {
    use std::path::Component;
    let ok = value
        .split(|c| c == '/' || c == '\\')
        .all(|part| !part.is_empty() && part != "." && part != "..")
        && Path::new(value)
            .components()
            .all(|c| matches!(c, Component::Normal(_)));
    if value.is_empty() || ok {
        Ok(())
    } else {
        Err(format!("Refused unsafe {}: {:?}", label, value))
    }
}

fn game_folder_path(exe_dir: &Path, path: &str, app_id: i64) -> Result<PathBuf, String> {
    ensure_plain_relative("game folder", path)?;
    let normalized_path = Path::new(path).to_string_lossy().to_string();

    Ok(exe_dir
        .join("games")
        .join(app_id.to_string())
        .join(normalized_path))
}

fn resolve_runner_template(handle: &AppHandle) -> Result<PathBuf, String> {
    handle
        .path()
        .resolve(runner_resource_name(), BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve runner template: {}", e))
}

fn make_macos_app_bundle(
    app_bundle_path: &Path,
    app_name: &str,
    display_name: &str,
    runner_template: &Path,
) -> Result<PathBuf, String> {
    let binary_name = bundle_binary_name(app_name);
    let macos_dir = app_bundle_path.join("Contents/MacOS");
    fs::create_dir_all(&macos_dir)
        .map_err(|e| format!("Failed to create app bundle directories: {}", e))?;

    let target_executable_path = macos_dir.join(&binary_name);
    fs::copy(runner_template, &target_executable_path)
        .map_err(|e| format!("Failed to copy dummy executable: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut permissions = fs::metadata(&target_executable_path)
            .map_err(|e| format!("Failed to read executable permissions: {}", e))?
            .permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&target_executable_path, permissions)
            .map_err(|e| format!("Failed to set executable permissions: {}", e))?;
    }

    let info_plist = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>{display_name}</string>
    <key>CFBundleExecutable</key>
    <string>{binary_name}</string>
    <key>CFBundleIdentifier</key>
    <string>me.markterence.discordquestcompleter.dummy</string>
    <key>CFBundleName</key>
    <string>{display_name}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
</dict>
</plist>
"#
    );

    fs::write(app_bundle_path.join("Contents/Info.plist"), info_plist)
        .map_err(|e| format!("Failed to write Info.plist: {}", e))?;

    Ok(target_executable_path)
}

fn launch_executable_path(game_folder_path: &Path, executable_name: &str) -> PathBuf {
    if is_app_bundle(executable_name) {
        game_folder_path
            .join(executable_name)
            .join("Contents/MacOS")
            .join(bundle_binary_name(executable_name))
    } else {
        game_folder_path.join(executable_name)
    }
}

fn stop_process_name(exec_name: &str) -> String {
    if is_app_bundle(exec_name) {
        bundle_binary_name(exec_name)
    } else {
        exec_name.to_string()
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command(rename_all = "snake_case")]
async fn create_fake_game(
    handle: tauri::AppHandle,
    path: &str,
    executable_name: &str,
    path_len: i64,
    app_id: i64,
    display_name: Option<String>,
) -> Result<String, String> {
    // Must create in the same directory as the executable to avoid permission issues
    // Get the executable directory to look for config file
    let exe_path: std::path::PathBuf = env::current_exe().unwrap_or_default();
    let exe_dir = exe_path.parent().unwrap_or_else(|| Path::new(""));

    if executable_name.is_empty() {
        return Err("Executable name is empty".to_string());
    }
    ensure_plain_relative("executable name", executable_name)?;
    let game_folder_path = game_folder_path(exe_dir, path, app_id)?;

    println!("Game folder path: {:?}", game_folder_path);
    println!(
        "Game full path: {:?}",
        game_folder_path.join(executable_name)
    );

    match fs::create_dir_all(&game_folder_path) {
        Ok(_) => {
            println!("Successfully created directory: {:?}", game_folder_path);
        }
        Err(e) => return Err(format!("Failed to create game folder: {}", e)),
    };

    let resource_path = resolve_runner_template(&handle)?;
    println!("Creating dummy game executable from: {:?}", resource_path);

    if is_app_bundle(executable_name) {
        let app_bundle_path = game_folder_path.join(executable_name);
        let bundle_display_name = display_name
            .filter(|name| !name.is_empty())
            .unwrap_or_else(|| bundle_binary_name(executable_name));
        let target_executable_path = make_macos_app_bundle(
            &app_bundle_path,
            executable_name,
            &bundle_display_name,
            &resource_path,
        )?;
        return Ok(format!(
            "Dummy app bundle created at: {:?}",
            target_executable_path
        ));
    }

    let target_executable_path = game_folder_path.join(executable_name);
    match fs::copy(&resource_path, &target_executable_path) {
        Ok(_) => {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = std::fs::metadata(&target_executable_path)
                    .map_err(|e| format!("Failed to get file metadata: {}", e))?
                    .permissions();
                perms.set_mode(0o755);
                std::fs::set_permissions(&target_executable_path, perms)
                    .map_err(|e| format!("Failed to set executable permissions: {}", e))?;
            }

            Ok(format!(
                "Dummy executable copied to: {:?}",
                target_executable_path
            ))
        }
        Err(e) => Err(format!("Failed to copy dummy executable: {}", e)),
    }
}

#[cfg(target_os = "macos")]
fn launch_macos_app_bundle(app_bundle_path: &Path, title: &str) -> Result<(), String> {
    let mut command = std::process::Command::new("open");
    command
        .arg("-n")
        .arg("-g")
        .arg("-a")
        .arg(app_bundle_path)
        .arg("--args")
        .arg("--title")
        .arg(title);

    command
        .spawn()
        .map_err(|e| format!("Failed to launch app bundle with open: {}", e))?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn run_background_process(
    name: &str,
    path: &str,
    executable_name: &str,
    path_len: i64,
    app_id: i64,
    icon_hash: Option<String>,
) -> Result<String, String> {
    let exe_path = env::current_exe().unwrap_or_default();
    let exe_dir = exe_path.parent().unwrap_or_else(|| Path::new(""));

    if executable_name.is_empty() {
        return Err("Executable name is empty".to_string());
    }
    ensure_plain_relative("executable name", executable_name)?;
    let game_folder_path = game_folder_path(exe_dir, path, app_id)?;

    if is_app_bundle(executable_name) {
        #[cfg(target_os = "macos")]
        {
            let bundle_path = game_folder_path.join(executable_name);
            launch_macos_app_bundle(&bundle_path, name)?;
            return Ok("App bundle launched successfully".to_string());
        }

        #[cfg(not(target_os = "macos"))]
        {
            let _ = name;
            return Err("App bundle launches are only supported on macOS".to_string());
        }
    }

    let executable_path = launch_executable_path(&game_folder_path, executable_name);
    
    // The window shows the game's icon when we can get it (saved once per game, next to its folder).
    let icon_path = match icon_hash.as_deref() {
        Some(hash) => {
            let per_game = exe_dir.join("games").join(app_id.to_string());
            icon::ensure_icon(&per_game, app_id, hash).await
        }
        None => None,
    };

    let mut cmd = std::process::Command::new(&executable_path);
    cmd.args(["--title", name]);
    if let Some(icon_path) = &icon_path {
        cmd.arg("--icon").arg(icon_path);
    }
    cmd.current_dir(game_folder_path);
    
    // Platform-specific process spawning
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0); // Create new process group on Unix
    }
    
    // Returns the process id so the caller can stop exactly this process later.
    match cmd.spawn() {
        Ok(child) => Ok(child.id().to_string()),
        Err(e) => Err(format!("Failed to start process: {}", e)),
    }
}

/// Stops one process by id, but only if it is still the fake game we started.
/// A stale or reused id belonging to another program is never killed.
#[tauri::command(rename_all = "snake_case")]
async fn stop_process_pid(pid: u32, exec_name: String) -> Result<(), String> {
    if pid == 0 {
        return Err("No process id to stop".to_string());
    }
    let expected = stop_process_name(&exec_name);

    #[cfg(target_os = "windows")]
    {
        let filter = format!("PID eq {}", pid);
        let listing = quiet_command("tasklist")
            .args(["/FI", &filter, "/FO", "CSV", "/NH"])
            .output()
            .map_err(|e| format!("Failed to execute tasklist: {}", e))?;
        let listing = String::from_utf8_lossy(&listing.stdout);
        let image = listing
            .lines()
            .find_map(|line| line.strip_prefix('"').and_then(|rest| rest.split('"').next()))
            .map(|name| name.to_string());

        match image {
            // Already gone: nothing to do.
            None => return Ok(()),
            Some(name) if !name.eq_ignore_ascii_case(&expected) => {
                return Err(format!(
                    "Process {} is now '{}', not '{}'; left it alone",
                    pid, name, expected
                ));
            }
            Some(_) => {}
        }

        let output = quiet_command("taskkill")
            .args(["/F", "/PID", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to execute taskkill: {}", e))?;
        if output.status.success() {
            Ok(())
        } else {
            Err(format!(
                "Failed to stop process: {}",
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let comm = fs::read_to_string(format!("/proc/{}/comm", pid)).ok();
        if let Some(comm) = comm {
            let comm = comm.trim();
            // /proc/<pid>/comm is cut to 15 characters.
            if !expected.starts_with(comm) {
                return Err(format!(
                    "Process {} is now '{}', not '{}'; left it alone",
                    pid, comm, expected
                ));
            }
        }
        let output = quiet_command("kill")
            .arg(pid.to_string())
            .output()
            .map_err(|e| format!("Failed to execute kill: {}", e))?;
        if output.status.success() || output.status.code() == Some(1) {
            Ok(())
        } else {
            Err(format!(
                "Failed to stop process: {}",
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn stop_process(exec_name: String) -> Result<(), String> {
    let process_name = stop_process_name(&exec_name);

    #[cfg(target_os = "windows")]
    {
        let output = quiet_command("taskkill")
            .arg("/F")
            .arg("/IM")
            .arg(&process_name)
            .output()
            .map_err(|e| format!("Failed to execute taskkill: {}", e))?;

        if output.status.success() {
            Ok(())
        } else {
            Err(format!(
                "Failed to stop process: {}",
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }

    #[cfg(target_os = "macos")]
    {
        if is_app_bundle(&exec_name) {
            let bundle_pattern = format!("{}/Contents/MacOS", exec_name);
            let output = std::process::Command::new("pkill")
                .arg("-f")
                .arg(&bundle_pattern)
                .output()
                .map_err(|e| format!("Failed to execute pkill: {}", e))?;

            if output.status.success() {
                return Ok(());
            }
        }

        let output = std::process::Command::new("pkill")
            .arg("-x")
            .arg(&process_name)
            .output()
            .map_err(|e| format!("Failed to execute pkill: {}", e))?;

        if output.status.success() || output.status.code() == Some(1) {
            Ok(())
        } else {
            Err(format!(
                "Failed to stop process: {}",
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }
    #[cfg(target_os = "linux")]
    {
        let output = std::process::Command::new("pkill")
            .arg("-f")
            .arg(&exec_name)
            .output()
            .map_err(|e| format!("Failed to execute pkill: {}", e))?;

        if output.status.success() || output.status.code() == Some(1) {
            // pkill returns 1 if no processes were killed, which is fine
            Ok(())
        } else {
            Err(format!(
                "Failed to stop process: {}",
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn fetch_gamelist_gh_mirror() -> tauri::ipc::Response {
    let res = tauri_plugin_http::reqwest::get("https://markterence.github.io/discord-quest-completer/detectable.json").await;
    tauri::ipc::Response::new(res.unwrap().text().await.unwrap())
}

#[tauri::command(rename_all = "snake_case")]
async fn fetch_gamelist_from_discord() -> tauri::ipc::Response {
    let res = tauri_plugin_http::reqwest::get("https://discord.com/api/applications/detectable").await;
    tauri::ipc::Response::new(res.unwrap().text().await.unwrap())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_fake_game,
            stop_process,
            stop_process_pid,
            run_background_process,
            fetch_gamelist_gh_mirror,
            fetch_gamelist_from_discord
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_names_are_accepted() {
        assert!(ensure_plain_relative("x", "").is_ok());
        assert!(ensure_plain_relative("x", "win64").is_ok());
        assert!(ensure_plain_relative("x", r"a/b\c").is_ok());
        assert!(ensure_plain_relative("x", "game.exe").is_ok());
    }

    #[test]
    fn escaping_names_are_refused() {
        for bad in ["..", "../x", "a/../b", r"a\..\b", "/abs", r"\abs", r"C:\x", "a//b", "./x", "a/"] {
            assert!(ensure_plain_relative("x", bad).is_err(), "should refuse {bad:?}");
        }
    }

    #[test]
    fn game_folder_stays_under_games() {
        let base = Path::new("base");
        assert!(game_folder_path(base, "../outside", 1).is_err());
        let ok = game_folder_path(base, "win64", 42).unwrap();
        assert!(ok.starts_with(base.join("games").join("42")));
    }
}
