import os
import shutil
import numpy as np
from PIL import Image

def process_loaders():
    gif_path = "C:/Users/anike/OneDrive/Documents/Coding/AgyFlow/public/dribbble-loader.gif"
    if not os.path.exists(gif_path):
        raise FileNotFoundError(f"Missing {gif_path}")

    im = Image.open(gif_path)
    n_frames = getattr(im, "n_frames", 1)
    duration = im.info.get("duration", 40)

    # The glowing infinity loop is strictly within y: 241..373, x: 235..577.
    # Below y: 375 in the original GIF is a flat ground pedestal and "LOADING..." text.
    # By cropping y to 175..385 and softly feathering the bottom, we preserve 100% of the
    # infinity loop curves & glow while eliminating the ground plane and any cut lines.
    CROP_BOX = (200, 175, 600, 385)
    crop_w = CROP_BOX[2] - CROP_BOX[0]  # 400
    crop_h = CROP_BOX[3] - CROP_BOX[1]  # 210

    dark_frames = []
    light_frames = []

    print(f"Extracting and processing {n_frames} frames ({crop_w}x{crop_h})...")

    # Smooth vertical fade at the bottom edge so glow seamlessly dissipates into transparency
    fade_start_y = 370 - CROP_BOX[1]  # row 195
    fade_end_y = crop_h               # row 210
    v_fade = np.ones(crop_h, dtype=float)
    if fade_end_y > fade_start_y:
        v_fade[fade_start_y:fade_end_y] = np.linspace(1.0, 0.0, fade_end_y - fade_start_y)

    for i in range(n_frames):
        im.seek(i)
        frame_rgb = np.array(im.convert("RGB"))

        # 1. Crop to the pure infinity loop
        cropped = frame_rgb[CROP_BOX[1]:CROP_BOX[3], CROP_BOX[0]:CROP_BOX[2]].copy()

        # 2. Clean alpha transparency (thresholded to erase background)
        BG_THRESH = 32.0
        max_c = cropped.max(axis=-1).astype(float)
        
        val_above_bg = np.maximum(0.0, max_c - BG_THRESH)
        max_possible = 255.0 - BG_THRESH
        
        alpha_float = np.clip((val_above_bg / max_possible) ** 0.85 * 255.0 * 1.3, 0.0, 255.0)
        alpha_float[max_c <= BG_THRESH] = 0.0

        # Apply smooth bottom feathering so there is zero hard boundary
        alpha_float = alpha_float * v_fade[:, np.newaxis]
        alpha = alpha_float.astype(np.uint8)

        # --- DARK MODE FRAME ---
        dark_rgba = np.dstack([cropped, alpha])
        dark_frames.append(Image.fromarray(dark_rgba, mode="RGBA"))

        # --- LIGHT MODE FRAME ---
        active_mask = alpha > 0
        r_act = cropped[active_mask, 0] / 255.0
        g_act = cropped[active_mask, 1] / 255.0
        b_act = cropped[active_mask, 2] / 255.0

        max_rgb = np.maximum(np.maximum(r_act, g_act), b_act)
        min_rgb = np.minimum(np.minimum(r_act, g_act), b_act)
        delta = max_rgb - min_rgb

        h = np.zeros_like(max_rgb)
        s = np.zeros_like(max_rgb)
        v = max_rgb

        nonzero_max = max_rgb > 0
        s[nonzero_max] = delta[nonzero_max] / max_rgb[nonzero_max]

        nonzero_delta = delta > 0
        idx_r = nonzero_delta & (max_rgb == r_act)
        idx_g = nonzero_delta & (max_rgb == g_act)
        idx_b = nonzero_delta & (max_rgb == b_act)

        h[idx_r] = ((g_act[idx_r] - b_act[idx_r]) / delta[idx_r]) % 6.0
        h[idx_g] = ((b_act[idx_g] - r_act[idx_g]) / delta[idx_g]) + 2.0
        h[idx_b] = ((r_act[idx_b] - g_act[idx_b]) / delta[idx_b]) + 4.0
        h = h / 6.0

        # Hue shift to purple (+0.21)
        h = (h + 0.21) % 1.0
        s = np.clip(s * 1.15, 0.0, 1.0)

        c = v * s
        x = c * (1.0 - np.abs((h * 6.0) % 2.0 - 1.0))
        m = v - c

        r_out = np.zeros_like(h)
        g_out = np.zeros_like(h)
        b_out = np.zeros_like(h)

        sector = (h * 6.0).astype(int) % 6
        s0, s1, s2, s3, s4, s5 = sector == 0, sector == 1, sector == 2, sector == 3, sector == 4, sector == 5

        r_out[s0], g_out[s0], b_out[s0] = c[s0], x[s0], 0
        r_out[s1], g_out[s1], b_out[s1] = x[s1], c[s1], 0
        r_out[s2], g_out[s2], b_out[s2] = 0, c[s2], x[s2]
        r_out[s3], g_out[s3], b_out[s3] = 0, x[s3], c[s3]
        r_out[s4], g_out[s4], b_out[s4] = x[s4], 0, c[s4]
        r_out[s5], g_out[s5], b_out[s5] = c[s5], 0, x[s5]

        light_cropped_r = np.zeros((crop_h, crop_w), dtype=np.uint8)
        light_cropped_g = np.zeros((crop_h, crop_w), dtype=np.uint8)
        light_cropped_b = np.zeros((crop_h, crop_w), dtype=np.uint8)

        light_cropped_r[active_mask] = np.clip((r_out + m) * 255.0, 0, 255).astype(np.uint8)
        light_cropped_g[active_mask] = np.clip((g_out + m) * 255.0, 0, 255).astype(np.uint8)
        light_cropped_b[active_mask] = np.clip((b_out + m) * 255.0, 0, 255).astype(np.uint8)

        light_rgba = np.dstack([light_cropped_r, light_cropped_g, light_cropped_b, alpha])
        light_frames.append(Image.fromarray(light_rgba, mode="RGBA"))

    print("Encoding loader-dark.webp...")
    dark_path = "src/assets/loader-dark.webp"
    dark_frames[0].save(
        dark_path,
        save_all=True,
        append_images=dark_frames[1:],
        duration=duration,
        loop=0,
        quality=85,
        method=4
    )
    shutil.copy(dark_path, "public/loader-dark.webp")
    print("✓ Saved loader-dark.webp")

    print("Encoding loader-light.webp...")
    light_path = "src/assets/loader-light.webp"
    light_frames[0].save(
        light_path,
        save_all=True,
        append_images=light_frames[1:],
        duration=duration,
        loop=0,
        quality=85,
        method=4
    )
    shutil.copy(light_path, "public/loader-light.webp")
    print("✓ Saved loader-light.webp")

if __name__ == "__main__":
    process_loaders()
