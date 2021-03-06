var container = document.querySelector(".container");

var A = new AudioContext();
var sample = document.querySelector("audio");
const SAMPLE_MAX = 256.0;
const FFT_SIZE = 256;

var source = A.createMediaElementSource(sample);

var analyser = A.createAnalyser();
analyser.fftSize = FFT_SIZE;

var gain = A.createGain();

var analyserPost = A.createAnalyser();
analyserPost.fftSize = FFT_SIZE;

source.connect(analyser);
analyser.connect(gain);
gain.connect(analyserPost);
analyserPost.connect(A.destination);

var widgets = [
    new SourceWidget(source),
    new AnalyserFrequencyWidget(analyser),
    new GainWidget(gain),
    new AnalyserFrequencyWidget(analyserPost),
    new SpectrogramWidget(analyserPost)
];

const COLORS = {
    BG: '#555555',
    WHITE: '#DDDDDD',
    ACCENT1: '#00C3FF',
    ACCENT2: '#FFFF1C'
}

//TODO fix prototype structure
function Widget(name, width, height) {
    this.name = name;
    //TODO support resizing?
    this.WIDTH = width;
    this.HEIGHT = height;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.WIDTH;
    this.canvas.height = this.HEIGHT;

    this.ctx = this.canvas.getContext("2d");
    this.ctx.transform(1, 0, 0, -1, 0, this.HEIGHT);

    var div = document.createElement("div");
    var title = document.createElement("h3");
    title.innerText = this.name;
    div.appendChild(title);
    div.appendChild(this.canvas);
    container.appendChild(div);
}

Widget.prototype.render = function() {
    this.ctx.fillStyle = COLORS.BG;
    this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
};

function SourceWidget(source) {
    Widget.call(this, "source", 64, 64);

    this.source = source;
    this.playing = false;

    this.canvas.onclick = function() {
        !this.playing ? this.play() : this.pause();
    }.bind(this);
};

SourceWidget.prototype.play = function() {
    this.source.mediaElement.currentTime = 0;
    this.source.mediaElement.play();
    this.playing = true;
}

SourceWidget.prototype.pause = function() {
    this.source.mediaElement.pause();
    this.playing = false;
}

SourceWidget.prototype.render = function() {
    Widget.prototype.render.call(this);

    this.ctx.fillStyle = COLORS.WHITE;
    if (!this.playing) {
        var h = this.HEIGHT / 3;
        var s = Math.sqrt(3) / 2 * h;

        this.ctx.beginPath();
        this.ctx.moveTo(this.WIDTH / 2 - s / 2, h);
        this.ctx.lineTo(this.WIDTH / 2 - s / 2, 2 * h);
        this.ctx.lineTo(this.WIDTH / 2 + s / 2, h + h / 2);
        this.ctx.closePath();
        this.ctx.fill();
    } else {
        var h = this.HEIGHT / 3;
        var w = h / 3;

        this.ctx.fillRect(this.WIDTH / 2 - 1.5 * w, h, w, h);
        this.ctx.fillRect(this.WIDTH / 2 + 0.5 * w, h, w, h);
    }
};

function AnalyserFrequencyWidget(analyser) {
    Widget.call(this, "spectrum", 1024, 256);

    this.analyser = analyser;
    this.bufLen = analyser.frequencyBinCount;
    this.data = new Uint8Array(this.bufLen);
};

AnalyserFrequencyWidget.prototype.render = function() {
    Widget.prototype.render.call(this);

    this.analyser.getByteFrequencyData(this.data);

    var w = this.WIDTH * 1.0 / this.bufLen;
    for (var i = 0; i < this.bufLen; i++) {
        var v = this.data[i] / SAMPLE_MAX;

        var gradient = this.ctx.createLinearGradient(0, 0, 0, this.HEIGHT);
        gradient.addColorStop(0.1, COLORS.ACCENT1);
        gradient.addColorStop(0.9, COLORS.ACCENT2);
        this.ctx.fillStyle = gradient;

        var x = i * w;
        var y = v * this.HEIGHT;

        this.ctx.fillRect(x + 1, 0, w - 1, y);
    }
};

var h2r = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
};

// Inverse of the above
var r2h = function(rgb) {
    return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
};

// Interpolates two [r,g,b] colors and returns an [r,g,b] of the result
// Taken from the awesome ROT.js roguelike dev library at
// https://github.com/ondras/rot.js
var _interpolateColor = function(color1, color2, factor) {
  if (arguments.length < 3) { factor = 0.5; }
  var result = color1.slice();
  for (var i=0;i<3;i++) {
    result[i] = Math.round(result[i] + factor*(color2[i]-color1[i]));
  }
  return result;
};

var rgb2hsl = function(color) {
  var r = color[0]/255;
  var g = color[1]/255;
  var b = color[2]/255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = (l > 0.5 ? d / (2 - max - min) : d / (max + min));
    switch(max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h, s, l];
};

var hsl2rgb = function(color) {
  var l = color[2];

  if (color[1] == 0) {
    l = Math.round(l*255);
    return [l, l, l];
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    var s = color[1];
    var q = (l < 0.5 ? l * (1 + s) : l + s - l * s);
    var p = 2 * l - q;
    var r = hue2rgb(p, q, color[0] + 1/3);
    var g = hue2rgb(p, q, color[0]);
    var b = hue2rgb(p, q, color[0] - 1/3);
    return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
  }
};

var _interpolateHSL = function(color1, color2, factor) {
  if (arguments.length < 3) { factor = 0.5; }
  var hsl1 = rgb2hsl(color1);
  var hsl2 = rgb2hsl(color2);
  for (var i=0;i<3;i++) {
    hsl1[i] += factor*(hsl2[i]-hsl1[i]);
  }
  return hsl2rgb(hsl1);
};

function SpectrogramWidget(analyser) {
    Widget.call(this, "spectrogram", 1024, 1024);

    this.tempCanvas = document.createElement("canvas");
    this.tempCanvas.width = this.WIDTH;
    this.tempCanvas.height = this.HEIGHT;
    this.tempCtx = this.tempCanvas.getContext("2d");
    this.tempCtx.transform(1, 0, 0, -1, 0, this.HEIGHT);

    this.analyser = analyser;
    this.bufLen = analyser.frequencyBinCount;

    this.data = new Uint8Array(this.bufLen);
    this.first = true;
    this.speed = 2;
};

SpectrogramWidget.prototype.render = function() {
    if (this.first) {
        Widget.prototype.render.call(this);
        this.first = false;
    }

    this.analyser.getByteFrequencyData(this.data);

    var h = this.HEIGHT * 1.0 / this.bufLen;

    this.tempCtx.drawImage(this.canvas, 0, 0, this.WIDTH, this.HEIGHT);

    for (var i = 0; i < this.bufLen; i++) {
        var v = this.data[i] / SAMPLE_MAX;

        var a, b;
            a = h2r(COLORS.BG);
            b = h2r(COLORS.WHITE);

        var c = _interpolateColor(a, b, v * 1.2);
        this.ctx.fillStyle = r2h(c);

        this.ctx.fillRect(this.WIDTH - this.speed, i * h, this.speed, h);
    }

    this.ctx.save();
    this.ctx.translate(-this.speed, 0);
    this.ctx.drawImage(this.tempCanvas, 0, 0, this.WIDTH, this.HEIGHT, 0, 0, this.WIDTH, this.HEIGHT);
    this.ctx.setTransform(1, 0, 0, -1, 0, this.HEIGHT);
};

function GainWidget(gain) {
    Widget.call(this, "gain", 1024, 128);

    this.gain = gain;
    this.MAX_GAIN = 15;
    this.pad = 13;

    this.adjusting = false;

    this.canvas.onmousedown = function() {
        this.adjusting = true;
    }.bind(this);

    this.canvas.onmouseup = function() {
        this.adjusting = false;
    }.bind(this);

    this.canvas.onmouseleave = function() {
        this.adjusting = false;
    }.bind(this);

    this.canvas.onmousemove = function(evt) {
        if (!this.adjusting) return false;

        var dim = evt.target.getBoundingClientRect();
        var relX = Math.min(this.WIDTH - 3 * this.pad, Math.max(3 * this.pad, evt.clientX - dim.left)) - 3 * this.pad;

        this.gain.gain.value = this.MAX_GAIN * relX / (this.WIDTH - 4 * this.pad);
    }.bind(this);
};

GainWidget.prototype.render = function() {
    Widget.prototype.render.call(this);

    var gradient = this.ctx.createLinearGradient(0, 0, this.WIDTH, 0);
    gradient.addColorStop(0.1, COLORS.ACCENT1);
    gradient.addColorStop(0.9, COLORS.ACCENT2);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 2 * this.pad;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(4 * this.pad, this.HEIGHT / 2);
    this.ctx.lineTo(this.WIDTH - 4 * this.pad, this.HEIGHT / 2);
    this.ctx.stroke();

    this.ctx.fillStyle = gradient;
    this.ctx.strokeStyle = COLORS.BG;
    this.ctx.lineWidth = 1;

    var relX = this.gain.gain.value / this.MAX_GAIN * (this.WIDTH - 6 * this.pad);
    this.ctx.beginPath();
    this.ctx.arc(relX + 4 * this.pad, this.HEIGHT / 2, 2 * this.pad, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();
};

function render() {
    for (var i = 0; i < widgets.length; i++) {
        widgets[i].render();
    }

    requestAnimationFrame(render);
}

render();

widgets[0].play();
