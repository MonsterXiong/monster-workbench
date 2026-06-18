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

pub(crate) fn build_mask_svg(mask: &NormalizedMask) -> String {
    let mut svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
<rect width="100%" height="100%" fill="black"/>
"#,
        width = mask.width,
        height = mask.height
    );
    for stroke in &mask.strokes {
        let color = if stroke.tool == "erase" {
            "black"
        } else {
            "white"
        };
        let points = stroke
            .points
            .iter()
            .map(|point| format!("{:.2},{:.2}", point.x, point.y))
            .collect::<Vec<_>>()
            .join(" ");
        svg.push_str(&format!(
            r#"<polyline points="{points}" fill="none" stroke="{color}" stroke-width="{width:.2}" stroke-linecap="round" stroke-linejoin="round"/>
"#,
            points = points,
            color = color,
            width = stroke.brush_size
        ));
    }
    svg.push_str("</svg>\n");
    svg
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn image_workbench_mask_builds_svg_from_paint_and_erase_strokes() {
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
        let svg = build_mask_svg(&mask);
        assert!(svg.contains(r#"stroke="white""#));
        assert!(svg.contains(r#"stroke="black""#));
        assert!(svg.contains(r#"viewBox="0 0 320 180""#));
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
