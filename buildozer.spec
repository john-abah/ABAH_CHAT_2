[app]

# (str) Title of your application
title = ABAH CHAT

# (str) Package name
package.name = abahchat

# (str) Package domain (needed for android/ios packaging)
package.domain = org.abah.chat

# (str) Source code where the main.py lives
source.dir = python_app

# (list) Source files to include (let empty to include all the files)
source.include_exts = py,png,jpg,kv,atlas,json

# (list) Application requirements
# comma separated e.g. requirements = sqlite3,kivy
requirements = python3,kivy,urllib3

# (str) Application versioning (method 1)
version = 1.0.0

# (str) Supported orientation (one of landscape, sensorLandscape, portrait or all)
orientation = portrait

# (bool) Indicate if the application should be fullscreen or not
fullscreen = 0

# (list) Permissions
android.permissions = INTERNET,ACCESS_NETWORK_STATE,WAKE_LOCK

# (int) Target Android API, should be as high as possible.
android.api = 34

# (int) Minimum API your APK will support.
android.minapi = 21

# (int) Android SDK version to use
android.sdk = 34

# (str) Android NDK version to use
android.ndk = 25b

# (bool) If True, then skip trying to update the Android SDK
# This can be useful to avoid excess downloads or save time
android.skip_update = False

# (bool) If True, then automatically accept SDK license
# agreements. This is intended for automation only
android.accept_sdk_license = True

# (str) Android entry point
android.entrypoint = org.kivy.android.PythonActivity

[buildozer]

# (int) Log level (0 = error only, 1 = info, 2 = debug (with command output))
log_level = 2

# (int) Display warning if buildozer is run as root (0 = False, 1 = True)
warn_on_root = 0
