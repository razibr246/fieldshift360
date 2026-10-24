# Photo tools (Python, optional)

The app does not need Python. These scripts make the photos the site serves, and run in the local environment
`.cache/venv-sr` (Pillow; PyTorch for the upscaler).

| Script | npm | What it does |
| --- | --- | --- |
| `upscale_photos.py` | — | Sharpens the site photos 4× with Real-ESRGAN and writes them at 900 / 1600 / 2400 / 3200 px (`src/assets/images/`) |
| `abroad_photos.py` | `npm run photos:abroad` | The neighbouring-country photos, the same way (`src/assets/images/abroad/`) |
| `nasa_images.py` | `npm run photos:nasa` | Photographs of Bangladesh from the NASA Image and Video Library, with credits (`src/assets/images/nasa/`, `src/data/media/nasa_images.json`) |

    python3 -m venv .cache/venv-sr && .cache/venv-sr/bin/pip install -r scripts/photos/requirements.txt
