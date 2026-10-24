from pathlib import Path
import shutil
root=Path('/opt/febro-ecosystem/phase4')
for app in ['central','lamariva','itinerary','voltlab','files','play']:
 target=root/'apps'/app/'sso';shutil.copytree(root/'runtime',target,dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules'))
 dep=target/'node_modules'
 if not dep.exists():dep.symlink_to('/opt/febro-ecosystem/sso-phase2/node_modules',target_is_directory=True)
