# WebGL Filter

This is an image editor written using WebGL that allows you to transform your images with various image filters (contrast adjustment, tilt-shift, lens defocus, etc.). WebGL is GPU programming for the web, and allows JavaScript web applications to attain performance that wouldn't otherwise be possible. It was originally written in 24 hours for HackNY 2011 but the core functionality was later moved to the [glfx.js](http://github.com/evanw/glfx.js) library.

# Running

While you can just open `www/index.html`, you won't be able to save because of the security protection on `file://` URLs. Instead, run `cd www && python -m SimpleHTTPServer` and visit `http://localhost:8000`.

# Screenshot

![](https://github.com/evanw/webgl-filter/raw/master/screenshot.png)
