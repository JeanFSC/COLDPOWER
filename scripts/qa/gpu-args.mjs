// Chromium flags so headless QA renders on the local GPU (Direct3D 11 via ANGLE)
// instead of SwiftShader software rendering on the CPU. Set QA_GPU=0 to disable.
export const GPU_ARGS = process.env.QA_GPU === "0" ? [] : ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"];
