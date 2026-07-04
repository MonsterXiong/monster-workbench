use crate::infra::{AppError, AppResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveImageWorkbenchMaskRequest {
    pub asset_id: String,
    pub width: u32,
    pub height: u32,
    #[serde(default)]
    pub strokes: Vec<ImageWorkbenchMaskStrokeInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchMaskStrokeInput {
    pub tool: String,
    pub brush_size: f64,
    #[serde(default)]
    pub points: Vec<ImageWorkbenchMaskPointInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchMaskPointInput {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveImageWorkbenchMaskResult {
    pub asset_id: String,
    pub mask_path: String,
    pub width: u32,
    pub height: u32,
    pub stroke_count: usize,
    pub point_count: usize,
    pub created_at_ms: i64,
}

#[derive(Debug, Clone)]
struct NormalizedMaskPoint {
    x: f64,
    y: f64,
}

#[derive(Debug, Clone)]
struct NormalizedMaskStroke {
    tool: String,
    brush_size: f64,
    points: Vec<NormalizedMaskPoint>,
}

#[derive(Debug, Clone)]
pub(crate) struct NormalizedMask {
    width: u32,
    height: u32,
    strokes: Vec<NormalizedMaskStroke>,
    point_count: usize,
}

impl NormalizedMask {
    pub(crate) fn width(&self) -> u32 {
        self.width
    }

    pub(crate) fn height(&self) -> u32 {
        self.height
    }

    pub(crate) fn stroke_count(&self) -> usize {
        self.strokes.len()
    }

    pub(crate) fn point_count(&self) -> usize {
        self.point_count
    }

    pub(crate) fn scaled_to(&self, width: u32, height: u32) -> NormalizedMask {
        if self.width == width && self.height == height {
            return self.clone();
        }
        let scale_x = width as f64 / self.width.max(1) as f64;
        let scale_y = height as f64 / self.height.max(1) as f64;
        let brush_scale = (scale_x + scale_y) / 2.0;
        NormalizedMask {
            width,
            height,
            strokes: self
                .strokes
                .iter()
                .map(|stroke| NormalizedMaskStroke {
                    tool: stroke.tool.clone(),
                    brush_size: (stroke.brush_size * brush_scale).clamp(1.0, 512.0),
                    points: stroke
                        .points
                        .iter()
                        .map(|point| NormalizedMaskPoint {
                            x: (point.x * scale_x).clamp(0.0, width as f64),
                            y: (point.y * scale_y).clamp(0.0, height as f64),
                        })
                        .collect(),
                })
                .collect(),
            point_count: self.point_count,
        }
    }
}

pub(crate) fn normalize_mask_strokes(
    width: u32,
    height: u32,
    strokes: Vec<ImageWorkbenchMaskStrokeInput>,
) -> AppResult<NormalizedMask> {
    if !(16..=4096).contains(&width) || !(16..=4096).contains(&height) {
        return Err(AppError::Config(
            "Image Workbench mask canvas must be between 16 and 4096 pixels".to_string(),
        ));
    }
    if strokes.is_empty() || strokes.len() > 256 {
        return Err(AppError::Config(
            "Image Workbench mask must contain 1 to 256 strokes".to_string(),
        ));
    }

    let mut point_count = 0usize;
    let mut normalized_strokes = Vec::new();
    for stroke in strokes {
        let tool = match stroke.tool.trim() {
            "paint" | "erase" => stroke.tool.trim().to_string(),
            _ => {
                return Err(AppError::Config(
                    "Image Workbench mask tool must be paint or erase".to_string(),
                ));
            }
        };
        if !(1.0..=160.0).contains(&stroke.brush_size) || !stroke.brush_size.is_finite() {
            return Err(AppError::Config(
                "Image Workbench mask brush size must be between 1 and 160".to_string(),
            ));
        }
        if stroke.points.len() < 2 || stroke.points.len() > 2048 {
            return Err(AppError::Config(
                "Image Workbench mask stroke must contain 2 to 2048 points".to_string(),
            ));
        }
        let mut points = Vec::new();
        for point in stroke.points {
            if !point.x.is_finite() || !point.y.is_finite() {
                return Err(AppError::Config(
                    "Image Workbench mask points must be finite numbers".to_string(),
                ));
            }
            points.push(NormalizedMaskPoint {
                x: point.x.clamp(0.0, width as f64),
                y: point.y.clamp(0.0, height as f64),
            });
        }
        point_count += points.len();
        if point_count > 10_000 {
            return Err(AppError::Config(
                "Image Workbench mask cannot exceed 10000 points".to_string(),
            ));
        }
        normalized_strokes.push(NormalizedMaskStroke {
            tool,
            brush_size: stroke.brush_size,
            points,
        });
    }

    Ok(NormalizedMask {
        width,
        height,
        strokes: normalized_strokes,
        point_count,
    })
}

pub(crate) fn build_mask_png(mask: &NormalizedMask) -> Vec<u8> {
    let alpha = rasterize_mask_alpha(mask);
    let width = mask.width as usize;
    let height = mask.height as usize;
    let mut scanlines = Vec::with_capacity(height.saturating_mul(width.saturating_mul(4) + 1));
    for y in 0..height {
        scanlines.push(0);
        for x in 0..width {
            scanlines.extend_from_slice(&[0, 0, 0, alpha[y * width + x]]);
        }
    }

    let mut png = Vec::new();
    png.extend_from_slice(b"\x89PNG\r\n\x1a\n");
    let mut ihdr = Vec::with_capacity(13);
    ihdr.extend_from_slice(&mask.width.to_be_bytes());
    ihdr.extend_from_slice(&mask.height.to_be_bytes());
    ihdr.extend_from_slice(&[8, 6, 0, 0, 0]);
    append_png_chunk(&mut png, b"IHDR", &ihdr);
    append_png_chunk(&mut png, b"IDAT", &zlib_store(&scanlines));
    append_png_chunk(&mut png, b"IEND", &[]);
    png
}

fn rasterize_mask_alpha(mask: &NormalizedMask) -> Vec<u8> {
    let width = mask.width as usize;
    let height = mask.height as usize;
    let mut alpha = vec![255; width.saturating_mul(height)];
    for stroke in &mask.strokes {
        let value = if stroke.tool == "erase" { 255 } else { 0 };
        let radius = (stroke.brush_size / 2.0).max(0.5);
        for pair in stroke.points.windows(2) {
            draw_line_alpha(&mut alpha, width, height, &pair[0], &pair[1], radius, value);
        }
    }
    alpha
}

fn draw_line_alpha(
    alpha: &mut [u8],
    width: usize,
    height: usize,
    start: &NormalizedMaskPoint,
    end: &NormalizedMaskPoint,
    radius: f64,
    value: u8,
) {
    let dx = end.x - start.x;
    let dy = end.y - start.y;
    let distance = (dx * dx + dy * dy).sqrt();
    let steps = (distance / radius.max(1.0)).ceil().max(1.0) as usize;
    for index in 0..=steps {
        let t = index as f64 / steps as f64;
        draw_circle_alpha(
            alpha,
            width,
            height,
            start.x + dx * t,
            start.y + dy * t,
            radius,
            value,
        );
    }
}

fn draw_circle_alpha(
    alpha: &mut [u8],
    width: usize,
    height: usize,
    center_x: f64,
    center_y: f64,
    radius: f64,
    value: u8,
) {
    let min_x = (center_x - radius).floor().max(0.0) as usize;
    let max_x = (center_x + radius)
        .ceil()
        .min(width.saturating_sub(1) as f64) as usize;
    let min_y = (center_y - radius).floor().max(0.0) as usize;
    let max_y = (center_y + radius)
        .ceil()
        .min(height.saturating_sub(1) as f64) as usize;
    let radius_sq = radius * radius;
    for y in min_y..=max_y {
        for x in min_x..=max_x {
            let pixel_x = x as f64 + 0.5;
            let pixel_y = y as f64 + 0.5;
            let dx = pixel_x - center_x;
            let dy = pixel_y - center_y;
            if dx * dx + dy * dy <= radius_sq {
                alpha[y * width + x] = value;
            }
        }
    }
}

fn append_png_chunk(target: &mut Vec<u8>, chunk_type: &[u8; 4], data: &[u8]) {
    target.extend_from_slice(&(data.len() as u32).to_be_bytes());
    target.extend_from_slice(chunk_type);
    target.extend_from_slice(data);
    let mut crc_input = Vec::with_capacity(chunk_type.len() + data.len());
    crc_input.extend_from_slice(chunk_type);
    crc_input.extend_from_slice(data);
    target.extend_from_slice(&crc32(&crc_input).to_be_bytes());
}

fn zlib_store(data: &[u8]) -> Vec<u8> {
    let mut result = Vec::with_capacity(data.len() + data.len() / 65_535 * 5 + 8);
    result.extend_from_slice(&[0x78, 0x01]);
    if data.is_empty() {
        result.extend_from_slice(&[1, 0, 0, 255, 255]);
    } else {
        for (index, chunk) in data.chunks(65_535).enumerate() {
            let final_block = index == (data.len() - 1) / 65_535;
            result.push(if final_block { 1 } else { 0 });
            let len = chunk.len() as u16;
            result.extend_from_slice(&len.to_le_bytes());
            result.extend_from_slice(&(!len).to_le_bytes());
            result.extend_from_slice(chunk);
        }
    }
    result.extend_from_slice(&adler32(data).to_be_bytes());
    result
}

fn adler32(data: &[u8]) -> u32 {
    const MOD: u32 = 65_521;
    let mut a = 1u32;
    let mut b = 0u32;
    for byte in data {
        a = (a + *byte as u32) % MOD;
        b = (b + a) % MOD;
    }
    (b << 16) | a
}

fn crc32(data: &[u8]) -> u32 {
    let mut crc = 0xFFFF_FFFFu32;
    for byte in data {
        crc ^= *byte as u32;
        for _ in 0..8 {
            let mask = (crc & 1).wrapping_neg();
            crc = (crc >> 1) ^ (0xEDB8_8320 & mask);
        }
    }
    !crc
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn image_workbench_mask_builds_png_alpha_from_paint_and_erase_strokes() {
        let mask = normalize_mask_strokes(
            320,
            180,
            vec![
                ImageWorkbenchMaskStrokeInput {
                    tool: "paint".to_string(),
                    brush_size: 24.0,
                    points: vec![
                        ImageWorkbenchMaskPointInput { x: 10.0, y: 20.0 },
                        ImageWorkbenchMaskPointInput { x: 100.0, y: 80.0 },
                    ],
                },
                ImageWorkbenchMaskStrokeInput {
                    tool: "erase".to_string(),
                    brush_size: 12.0,
                    points: vec![
                        ImageWorkbenchMaskPointInput { x: 40.0, y: 60.0 },
                        ImageWorkbenchMaskPointInput { x: 50.0, y: 70.0 },
                    ],
                },
            ],
        )
        .expect("valid mask");

        assert_eq!(mask.width(), 320);
        assert_eq!(mask.height(), 180);
        assert_eq!(mask.stroke_count(), 2);
        assert_eq!(mask.point_count(), 4);
        let png = build_mask_png(&mask);
        assert!(png.starts_with(b"\x89PNG\r\n\x1a\n"));
        assert_eq!(&png[16..20], &320u32.to_be_bytes());
        assert_eq!(&png[20..24], &180u32.to_be_bytes());
        assert_eq!(png[25], 6);

        let alpha = rasterize_mask_alpha(&mask);
        assert_eq!(alpha[20 * 320 + 10], 0);
        assert_eq!(alpha[60 * 320 + 40], 255);
    }

    #[test]
    fn image_workbench_mask_scales_to_target_dimensions() {
        let mask = normalize_mask_strokes(
            100,
            50,
            vec![ImageWorkbenchMaskStrokeInput {
                tool: "paint".to_string(),
                brush_size: 10.0,
                points: vec![
                    ImageWorkbenchMaskPointInput { x: 10.0, y: 5.0 },
                    ImageWorkbenchMaskPointInput { x: 20.0, y: 10.0 },
                ],
            }],
        )
        .expect("valid mask");

        let scaled = mask.scaled_to(200, 100);
        assert_eq!(scaled.width(), 200);
        assert_eq!(scaled.height(), 100);
        assert_eq!(scaled.strokes[0].brush_size, 20.0);
        assert_eq!(scaled.strokes[0].points[0].x, 20.0);
        assert_eq!(scaled.strokes[0].points[0].y, 10.0);
    }

    #[test]
    fn image_workbench_mask_rejects_invalid_points_and_empty_strokes() {
        assert!(normalize_mask_strokes(320, 180, Vec::new()).is_err());
        assert!(normalize_mask_strokes(
            320,
            180,
            vec![ImageWorkbenchMaskStrokeInput {
                tool: "paint".to_string(),
                brush_size: 24.0,
                points: vec![
                    ImageWorkbenchMaskPointInput {
                        x: f64::NAN,
                        y: 20.0
                    },
                    ImageWorkbenchMaskPointInput { x: 100.0, y: 80.0 },
                ],
            }],
        )
        .is_err());
    }
}
