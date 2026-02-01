# Cloudflare Speed Optimization

## Navigation Path
Cloudflare Dashboard → Speed → Optimization

## Settings

### Compression
- **Brotli:** ✅ Enabled
- **Auto Minify:**
  - HTML: ✅ ON
  - CSS: ✅ ON
  - JavaScript: ✅ ON

### Network
- **HTTP/3 (with QUIC):** ✅ Enabled
- **0-RTT Connection Resumption:** ✅ Enabled (if available)
- **Early Hints:** ✅ Enabled

### Optimization
- **Rocket Loader:** ✅ ON
- **Mirage:** (Optional - image optimization)
- **Polish:** (Optional - image compression)

---

## Performance Features Explained

### Brotli
- Better compression than gzip
- Reduces bandwidth usage
- Faster page loads

### HTTP/3 (QUIC)
- Latest HTTP protocol
- Faster connection establishment
- Better performance on mobile networks

### Early Hints
- Sends resource hints before full response
- Reduces perceived load time

### Rocket Loader
- Defers JavaScript loading
- Improves page render time
- May conflict with some JS - test thoroughly

### Auto Minify
- Removes whitespace and comments
- Reduces file sizes
- Faster downloads

---

## Testing Performance

After enabling features:
1. Test page load speed: `curl -I https://tomo-sa.com`
2. Check compression: Look for `content-encoding: br` header
3. Verify HTTP/3: Check browser network tab
4. Test Rocket Loader: Ensure JS still works correctly
