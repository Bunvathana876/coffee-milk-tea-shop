"""Create an exclusive local source snapshot, including untracked source, without secrets."""
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import tarfile

root = Path(__file__).resolve().parents[2]
target = Path(sys.argv[1]).resolve()
if target.is_relative_to(root):
    raise SystemExit('Snapshot must be outside the workspace.')
paths = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=root).split(b'\0')
selected = []
for protected in ('management-portal', 'mobile_app'):
    for directory, children, files in os.walk(root / protected):
        children[:] = [name for name in children if name not in {
            '.git', 'node_modules', 'build', 'dist', '.dart_tool', '.gradle', 'Pods', '.symlinks', '.idea', 'ephemeral'
        }]
        for name in files:
            paths.append(os.fsencode(str((Path(directory) / name).relative_to(root))))
for raw in paths:
    if not raw:
        continue
    relative = Path(os.fsdecode(raw))
    name = relative.name.lower()
    if (name.startswith('.env') and not name.endswith('.example')) or name.endswith(('.pem', '.key', '.p12', '.dump', '.keystore', '.jks')) or name == 'key.properties':
        continue
    source = root / relative
    if source.is_file() and not source.is_symlink():
        selected.append(relative)
with open(target, 'xb') as stream:
    os.chmod(target, 0o600)
    with tarfile.open(fileobj=stream, mode='w:gz') as archive:
        for relative in sorted(set(selected)):
            archive.add(root / relative, arcname=str(relative), recursive=False)
digest = hashlib.file_digest(open(target, 'rb'), 'sha256').hexdigest()
print(f'Source snapshot: {len(set(selected))} files; SHA-256 {digest}')
