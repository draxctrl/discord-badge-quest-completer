//! Game icons for the stand-in window.
//!
//! The icon comes from Discord's own image server (the same picture Discord
//! shows for the game). It is shrunk and saved as a small BMP next to the fake
//! game, because the tiny Windows helper program can load a BMP without any
//! image library. If anything goes wrong the window simply has no icon.

use std::path::{Path, PathBuf};
use std::time::Duration;

/// Edge length of the saved icon, in pixels (shown at 84 px, so this stays sharp on scaled screens).
const ICON_SIZE: u32 = 192;
/// Largest download accepted, so a wrong or hostile response cannot fill the disk.
const MAX_DOWNLOAD_BYTES: usize = 4 * 1024 * 1024;
/// The window's card color; transparent parts of an icon are blended onto it.
const BACKGROUND: [u8; 3] = [33, 26, 22];

/// Discord icon hashes are lowercase hex (optionally with an `a_` prefix for animated icons).
pub fn valid_icon_hash(hash: &str) -> bool {
    let body = hash.strip_prefix("a_").unwrap_or(hash);
    !body.is_empty() && body.len() <= 64 && body.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

/// Turns a PNG into a square 24-bit BMP of `size` pixels, blending transparency onto `background`.
pub fn png_to_bmp(png: &[u8], size: u32, background: [u8; 3]) -> Result<Vec<u8>, String> {
    let decoded = image::load_from_memory_with_format(png, image::ImageFormat::Png)
        .map_err(|e| format!("Not a readable PNG: {}", e))?
        .to_rgba8();
    let resized = image::imageops::resize(&decoded, size, size, image::imageops::FilterType::Lanczos3);

    let mut flat = image::RgbImage::new(size, size);
    for (x, y, px) in resized.enumerate_pixels() {
        let alpha = px[3] as u32;
        let mix = |c: u8, bg: u8| ((c as u32 * alpha + bg as u32 * (255 - alpha)) / 255) as u8;
        flat.put_pixel(x, y, image::Rgb([mix(px[0], background[0]), mix(px[1], background[1]), mix(px[2], background[2])]));
    }

    let mut out = Vec::new();
    image::codecs::bmp::BmpEncoder::new(&mut out)
        .encode(flat.as_raw(), size, size, image::ExtendedColorType::Rgb8)
        .map_err(|e| format!("Could not write BMP: {}", e))?;
    Ok(out)
}

/// Makes sure `<folder>/icon.bmp` exists for this game and returns its path.
/// Downloads at most once per game; returns None when the icon is unavailable.
pub async fn ensure_icon(game_folder: &Path, app_id: i64, hash: &str) -> Option<PathBuf> {
    if !valid_icon_hash(hash) {
        eprintln!("Ignoring icon hash with unexpected characters");
        return None;
    }
    let target = game_folder.join("icon.bmp");
    if target.is_file() {
        return Some(target);
    }

    // Only ever this one host, with an id and hash that were checked above.
    let url = format!("https://cdn.discordapp.com/app-icons/{}/{}.png?size=256", app_id, hash);
    let client = reqwest::Client::builder().timeout(Duration::from_secs(8)).build().ok()?;
    let response = client.get(&url).send().await.ok()?;
    if !response.status().is_success() {
        return None;
    }
    if response.content_length().map_or(false, |n| n as usize > MAX_DOWNLOAD_BYTES) {
        return None;
    }
    let bytes = response.bytes().await.ok()?;
    if bytes.len() > MAX_DOWNLOAD_BYTES {
        return None;
    }

    let bmp = match png_to_bmp(&bytes, ICON_SIZE, BACKGROUND) {
        Ok(bmp) => bmp,
        Err(e) => {
            eprintln!("Icon for {} not used: {}", app_id, e);
            return None;
        }
    };
    std::fs::create_dir_all(game_folder).ok()?;
    std::fs::write(&target, bmp).ok()?;
    Some(target)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_check_accepts_only_hex() {
        assert!(valid_icon_hash("a60bb76ba4d4acafbd4cb9aad6e61739"));
        assert!(valid_icon_hash("a_0123abcd"));
        for bad in ["", "a_", "../x", "abc/def", "ABC", "abc.png", "abc?x=1", "g123", "a60b b76b"] {
            assert!(!valid_icon_hash(bad), "should refuse {bad:?}");
        }
        assert!(!valid_icon_hash(&"a".repeat(65)));
    }

    fn sample_png(w: u32, h: u32, rgba: [u8; 4]) -> Vec<u8> {
        let img = image::RgbaImage::from_pixel(w, h, image::Rgba(rgba));
        let mut out = Vec::new();
        img.write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png).unwrap();
        out
    }

    #[test]
    fn converts_png_to_square_bmp() {
        let bmp = png_to_bmp(&sample_png(4, 4, [255, 0, 0, 255]), 8, [0, 0, 0]).unwrap();
        assert_eq!(&bmp[..2], b"BM");
        // 54-byte header + 8 rows of 8 pixels x 3 bytes (24 bytes, already 4-byte aligned)
        assert_eq!(bmp.len(), 54 + 8 * 24);
    }

    #[test]
    fn transparent_pixels_take_the_background_color() {
        let bmp = png_to_bmp(&sample_png(2, 2, [255, 255, 255, 0]), 2, [10, 20, 30]).unwrap();
        // BMP pixel data is stored as B, G, R after the 54-byte header
        assert_eq!(&bmp[54..57], &[30, 20, 10]);
    }

    #[test]
    fn rejects_data_that_is_not_a_png() {
        assert!(png_to_bmp(b"not an image", 8, [0, 0, 0]).is_err());
        assert!(png_to_bmp(&[], 8, [0, 0, 0]).is_err());
    }
}
