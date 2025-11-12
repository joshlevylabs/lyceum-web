# Media Assets Guide - Native App Subscribe Page

This guide explains how to add screenshots and videos to the native app subscription page.

## File Structure

Create the following directories in your `public` folder:

```
public/
├── screenshots/
│   ├── cluster-management.png
│   ├── test-data-projects.png
│   ├── plugin-ecosystem.png
│   └── realtime-sync.png
└── videos/
    └── demo.mp4
```

## Adding Screenshots

### 1. Cluster Management Screenshot
**Location:** `public/screenshots/cluster-management.png`
**Recommended size:** 1920x1080px or 16:9 aspect ratio
**Shows:**
- Cluster registration interface
- Connected clusters list
- Health status indicators
- Cluster details view

To add, replace this placeholder in [src/app/native-app/subscribe/page.tsx:421-422](src/app/native-app/subscribe/page.tsx#L421-L422):
```tsx
{/* TODO: Add actual screenshot */}
{/* <img src="/screenshots/cluster-management.png" alt="Cluster Management" className="w-full h-full object-cover" /> */}
```

With:
```tsx
<img
  src="/screenshots/cluster-management.png"
  alt="Cluster Management Interface"
  className="w-full h-full object-cover"
/>
```

### 2. Test Data Projects Screenshot
**Location:** `public/screenshots/test-data-projects.png`
**Recommended size:** 1920x1080px or 16:9 aspect ratio
**Shows:**
- Project list view
- Import/export interface
- Data grid with filtering
- Project management tools

Update the placeholder at line 439.

### 3. Plugin Ecosystem Screenshot
**Location:** `public/screenshots/plugin-ecosystem.png`
**Recommended size:** 1920x1080px or 16:9 aspect ratio
**Shows:**
- Plugin store/marketplace
- Installed plugins list
- Plugin details view
- Installation process

Update the placeholder at line 517.

### 4. Real-time Sync Screenshot
**Location:** `public/screenshots/realtime-sync.png`
**Recommended size:** 1920x1080px or 16:9 aspect ratio
**Shows:**
- Sync status indicator
- Sync history/logs
- Multi-device view
- Conflict resolution interface

Update the placeholder at line 533.

## Adding Demo Video

### Video Specifications
**Location:** `public/videos/demo.mp4`
**Format:** MP4 (H.264 codec recommended)
**Resolution:** 1920x1080px (1080p) recommended
**Duration:** 1-3 minutes
**File size:** Under 50MB for web performance
**Content:**
- App overview (10-15 seconds)
- Cluster registration demo (20-30 seconds)
- Data project management (20-30 seconds)
- Plugin installation (15-20 seconds)
- Sync demonstration (15-20 seconds)
- Closing/call-to-action (10 seconds)

### Adding the Video

1. Place your video file at `public/videos/demo.mp4`

2. Replace the placeholder at [src/app/native-app/subscribe/page.tsx:367-371](src/app/native-app/subscribe/page.tsx#L367-L371):

```tsx
{/* TODO: Add actual video element */}
{/* <video controls className="w-full h-full object-cover">
  <source src="/videos/demo.mp4" type="video/mp4" />
</video> */}
```

With:

```tsx
<video
  controls
  className="w-full h-full object-cover"
  poster="/screenshots/video-thumbnail.png"
>
  <source src="/videos/demo.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>
```

### Alternative: YouTube/Vimeo Embed

If you prefer to host the video on YouTube or Vimeo instead:

```tsx
<div className="aspect-video">
  <iframe
    className="w-full h-full rounded-lg"
    src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
    title="Centcom/Lyceum Native Demo"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
  />
</div>
```

## Screenshot Tips

### Best Practices
1. **Clean Interface**: Remove any sensitive or test data
2. **Proper Lighting**: Use light mode for consistency (or ensure dark mode is polished)
3. **Highlight Features**: Use subtle highlights or arrows to draw attention
4. **High Quality**: Use high-resolution screenshots (2x or 3x scale)
5. **Consistent Style**: Keep the same theme/styling across all screenshots

### Taking Screenshots
- **Windows**: Windows + Shift + S
- **macOS**: Command + Shift + 4
- **Linux**: Depends on distribution (usually Shift + PrtScn)

### Optimization
Use tools to optimize images before uploading:
- **TinyPNG**: https://tinypng.com/
- **ImageOptim** (macOS): https://imageoptim.com/
- **Squoosh**: https://squoosh.app/

Target optimized size:
- Screenshots: 200-500KB each
- Video: Under 50MB

## Updating the Code

Once you have your media assets ready:

1. Place files in appropriate directories:
   ```
   public/screenshots/cluster-management.png
   public/screenshots/test-data-projects.png
   public/screenshots/plugin-ecosystem.png
   public/screenshots/realtime-sync.png
   public/videos/demo.mp4
   ```

2. Uncomment and update the code in `src/app/native-app/subscribe/page.tsx`:
   - Video section at line ~368
   - Screenshot 1 at line ~422
   - Screenshot 2 at line ~439
   - Screenshot 3 at line ~517
   - Screenshot 4 at line ~533

3. Test the page to ensure all assets load correctly

## Testing

After adding media assets, test:
- [ ] Images load correctly on desktop
- [ ] Images load correctly on mobile
- [ ] Images are optimized (page load time < 3 seconds)
- [ ] Video plays correctly
- [ ] Video controls work
- [ ] Dark mode styling looks good with media
- [ ] Alt text is descriptive for accessibility

## Fallback Options

If you don't have media assets yet, the page will display:
- **Video**: Play button overlay with descriptive text
- **Screenshots**: Icon placeholders with descriptive labels

This allows the page to function while you prepare the media assets.
