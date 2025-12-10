# PWA Icons - NawaNapam

The `/public/icons` directory needs the following icon files for PWA support:

## Required Icon Sizes:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons:

You can use any of these methods:

1. **Using Favicon Generator** (Recommended)

   - Visit https://realfavicongenerator.net/
   - Upload your logo/icon
   - Download the generated package
   - Place the PNG files in this directory

2. **Using PWA Asset Generator**

   ```bash
   npx pwa-asset-generator [source-image] public/icons --manifest public/manifest.json
   ```

3. **Manual Creation**
   - Use any image editor (Photoshop, GIMP, Figma, etc.)
   - Create a square design for your app
   - Export at each required size
   - Ensure high contrast and clarity at smaller sizes

## Design Tips:

- Use a simple, recognizable design
- Ensure the icon works on both light and dark backgrounds
- Test how it looks at small sizes (72x72)
- Consider using your brand colors
- Avoid text that becomes unreadable at small sizes
