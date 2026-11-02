import json
import time
import urllib.request
import urllib.error
import sys
import os
import shutil
import subprocess

COMFY_URL = 'http://127.0.0.1:18188'

POSITIVE_PROMPT = (
    'young Hispanic man with short dark hair, neatly trimmed beard and mustache, '
    'wearing black-rimmed glasses, expressive and focused face, wearing a textured '
    'green woodland camouflage CRKS pullover hoodie, realistic fabric folds and ribbed cuffs, '
    'dimly lit police station locker room, rows of blue metal lockers with duty stickers, '
    'wooden bench, gritty cinematic atmosphere, overhead cold fluorescent tube lighting, '
    'dramatic chiaroscuro shadows, subtle rim light highlighting spectacle frames and jawline, '
    'shot on Arri Alexa Mini with Cooke Anamorphic/i 35mm prime lens, organic focal falloff, '
    'shallow depth of field, authentic 35mm motion picture film scan, fine organic grain, '
    'Kodak Vision3 500T color science, natural skin pores, zero artificial plastic texture'
)

NEGATIVE_PROMPT = (
    'deformed, distorted, disfigured, poorly drawn, bad anatomy, bad proportions, '
    'unnatural body, mutated limbs, extra arms, extra legs, malformed limbs, '
    'fused fingers, too many fingers, missing limbs, bad hands, low resolution, '
    'blurry, artifacts, watermark, logo, text, oversaturated, plastic skin, '
    '3d render, cartoon, anime, artificial grid lines, cyber mesh'
)

def submit_prompt(prompt_graph, client_id='genjutsu_scail2'):
    req_data = json.dumps({'prompt': prompt_graph, 'client_id': client_id}).encode('utf-8')
    req = urllib.request.Request(f'{COMFY_URL}/prompt', data=req_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return res['prompt_id']

def wait_for_completion(prompt_id, label='Segment'):
    start_time = time.time()
    print(f'[{label}] Submitted prompt ID: {prompt_id}. Waiting for completion...')
    while True:
        time.sleep(3)
        elapsed = int(time.time() - start_time)
        try:
            with urllib.request.urlopen(f'{COMFY_URL}/history/{prompt_id}') as hresp:
                hist = json.loads(hresp.read().decode('utf-8'))
                if prompt_id in hist:
                    entry = hist[prompt_id]
                    status = entry.get('status', {})
                    if status.get('completed', False):
                        print(f'\n[{label} SUCCESS] Completed in {elapsed}s!')
                        outputs = entry.get('outputs', {})
                        for nid, nout in outputs.items():
                            vids = nout.get('videos', []) or nout.get('images', [])
                            for v in vids:
                                fname = v.get('filename')
                                sub = v.get('subfolder', '')
                                fpath = os.path.join('/workspace/ComfyUI/output', sub, fname)
                                if os.path.exists(fpath):
                                    return fpath
                        return None
                    if status.get('status_str') == 'error':
                        print(f'\n[{label} ERROR] Execution failed: {status.get("messages")}')
                        sys.exit(1)
        except Exception:
            pass
        print(f'\r[{label} running... {elapsed}s]', end='', flush=True)

# ----------------------------------------------------
# MAIN PIPELINE
# ----------------------------------------------------
print('=== STARTING GENJUTSU SCAIL-2 RECAST PIPELINE ===')

with open('/workspace/recast_prompt.json', 'r') as f:
    base_data = json.load(f)

base_prompt = base_data.get('prompt', base_data)

# Inject Genjutsu assets & Prompt Composer text
base_prompt['30']['inputs']['image'] = 'genjutsu_replacement_shot0_front.jpg'
base_prompt['155']['inputs']['file'] = 'driving_master_6s.mp4'
base_prompt['213:3']['inputs']['text'] = POSITIVE_PROMPT
base_prompt['213:4']['inputs']['text'] = NEGATIVE_PROMPT

# -----------------
# 1. SEGMENT 1 (Frames 0 to 80 = 81 frames)
# -----------------
print('\n--- [1/4] EXECUTING SEGMENT 1 (81 frames) ---')
seg1_graph = json.loads(json.dumps(base_prompt))
seg1_graph['213:177']['inputs']['batch_index'] = 0
seg1_graph['213:177']['inputs']['length'] = 81
seg1_graph['202']['inputs']['filename_prefix'] = 'freefield/genjutsu_seg1'

pid1 = submit_prompt(seg1_graph, 'genjutsu_seg1')
seg1_out = wait_for_completion(pid1, 'Segment 1')
if not seg1_out or not os.path.exists(seg1_out):
    seg1_out = '/workspace/ComfyUI/output/freefield/genjutsu_seg1_00001_.mp4'

print(f'Segment 1 output path: {seg1_out} ({os.path.getsize(seg1_out)/1e6:.2f} MB)')
shutil.copy2(seg1_out, '/workspace/ComfyUI/input/seg1_genjutsu.mp4')
shutil.copy2(seg1_out, '/workspace/genjutsu_seg1.mp4')

# -----------------
# 2. SEGMENT 2 (Frames 76 to 156 = 81 frames, 5 frame overlap)
# -----------------
print('\n--- [2/4] EXECUTING SEGMENT 2 (81 frames, anchored on seg1) ---')
seg2_graph = json.loads(json.dumps(base_prompt))
seg2_graph['213:177']['inputs']['batch_index'] = 76
seg2_graph['213:177']['inputs']['length'] = 81
seg2_graph['202']['inputs']['filename_prefix'] = 'freefield/genjutsu_seg2'

seg2_graph['250'] = {
    'class_type': 'LoadVideo',
    'inputs': {'file': 'seg1_genjutsu.mp4'},
    '_meta': {'title': 'Load Segment 1 Video'}
}
seg2_graph['251'] = {
    'class_type': 'GetVideoComponents',
    'inputs': {'video': ['250', 0]},
    '_meta': {'title': 'Get Segment 1 Components'}
}
seg2_graph['213:114']['inputs']['previous_frames'] = ['251', 0]
seg2_graph['213:114']['inputs']['video_frame_offset'] = 0
seg2_graph['213:114']['inputs']['previous_frame_count'] = 5

pid2 = submit_prompt(seg2_graph, 'genjutsu_seg2')
seg2_out = wait_for_completion(pid2, 'Segment 2')
if not seg2_out or not os.path.exists(seg2_out):
    seg2_out = '/workspace/ComfyUI/output/freefield/genjutsu_seg2_00001_.mp4'

print(f'Segment 2 output path: {seg2_out} ({os.path.getsize(seg2_out)/1e6:.2f} MB)')
shutil.copy2(seg2_out, '/workspace/ComfyUI/input/seg2_genjutsu.mp4')
shutil.copy2(seg2_out, '/workspace/genjutsu_seg2_raw.mp4')

# -----------------
# 3. SEGMENT 3 (Frames 152 to 200 = 49 frames, 5 frame overlap)
# -----------------
print('\n--- [3/4] EXECUTING SEGMENT 3 (49 frames, anchored on seg2) ---')
seg3_graph = json.loads(json.dumps(base_prompt))
seg3_graph['213:177']['inputs']['batch_index'] = 152
seg3_graph['213:177']['inputs']['length'] = 49
seg3_graph['202']['inputs']['filename_prefix'] = 'freefield/genjutsu_seg3'

seg3_graph['250'] = {
    'class_type': 'LoadVideo',
    'inputs': {'file': 'seg2_genjutsu.mp4'},
    '_meta': {'title': 'Load Segment 2 Video'}
}
seg3_graph['251'] = {
    'class_type': 'GetVideoComponents',
    'inputs': {'video': ['250', 0]},
    '_meta': {'title': 'Get Segment 2 Components'}
}
seg3_graph['213:114']['inputs']['previous_frames'] = ['251', 0]
seg3_graph['213:114']['inputs']['video_frame_offset'] = 0
seg3_graph['213:114']['inputs']['previous_frame_count'] = 5

pid3 = submit_prompt(seg3_graph, 'genjutsu_seg3')
seg3_out = wait_for_completion(pid3, 'Segment 3')
if not seg3_out or not os.path.exists(seg3_out):
    seg3_out = '/workspace/ComfyUI/output/freefield/genjutsu_seg3_00001_.mp4'

print(f'Segment 3 output path: {seg3_out} ({os.path.getsize(seg3_out)/1e6:.2f} MB)')
shutil.copy2(seg3_out, '/workspace/genjutsu_seg3_raw.mp4')

# -----------------
# 4. TRIMMING, CONCATENATION & AUDIO REMUXING
# -----------------
print('\n--- [4/4] STITCHING MULTI-CHUNK LATENTS & REMUXING AUDIO ---')
os.chdir('/workspace')

# Trim seg2 (skip first 5 anchor frames)
cmd_trim2 = [
    'ffmpeg', '-y', '-i', '/workspace/genjutsu_seg2_raw.mp4',
    '-vf', "select='gte(n,5)',setpts=PTS-STARTPTS",
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30',
    '/workspace/genjutsu_seg2_trimmed.mp4'
]
subprocess.run(cmd_trim2, check=True)

# Trim seg3 (skip first 5 anchor frames)
cmd_trim3 = [
    'ffmpeg', '-y', '-i', '/workspace/genjutsu_seg3_raw.mp4',
    '-vf', "select='gte(n,5)',setpts=PTS-STARTPTS",
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30',
    '/workspace/genjutsu_seg3_trimmed.mp4'
]
subprocess.run(cmd_trim3, check=True)

# Write concat list
with open('/workspace/genjutsu_concat_list.txt', 'w') as f:
    f.write("file '/workspace/genjutsu_seg1.mp4'\nfile '/workspace/genjutsu_seg2_trimmed.mp4'\nfile '/workspace/genjutsu_seg3_trimmed.mp4'\n")

# Concat video
cmd_concat = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', '/workspace/genjutsu_concat_list.txt', '-c', 'copy', '/workspace/genjutsu_concat.mp4']
subprocess.run(cmd_concat, check=True)

# Mux audio from original driving_master_6s.mp4
final_master = '/workspace/genjutsu_recast_full_6s_master.mp4'
cmd_mux = [
    'ffmpeg', '-y', '-i', '/workspace/genjutsu_concat.mp4',
    '-i', '/workspace/ComfyUI/input/driving_master_6s.mp4',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-map', '0:v:0', '-map', '1:a:0', '-shortest',
    final_master
]
subprocess.run(cmd_mux, check=True)

print(f'\n=== MASTER GENJUTSU RECAST VIDEO GENERATED SUCCESSFULLY ===')
print(f'Master File: {final_master} ({os.path.getsize(final_master)/1e6:.2f} MB)')
