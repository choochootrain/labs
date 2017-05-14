var container = document.querySelector(".container");

var A = new AudioContext();
var sample = document.querySelector("audio");
const SAMPLE_MAX = 256.0;
const FFT_SIZE = 64;

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
    new AnalyserFrequencyWidget(analyserPost)
];

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
    this.ctx.fillStyle = '#555555';
    this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
};

function SourceWidget(source) {
    Widget.call(this, "source", 64, 64);

    this.source = source;
    this.playing = false;

    this.canvas.onclick = function() {
        !this.playing ? this.play() : this.pause();
        this.playing = !this.playing;
    }.bind(this);
};

SourceWidget.prototype.play = function() {
    this.source.mediaElement.currentTime = 0;
    this.source.mediaElement.play();
}

SourceWidget.prototype.pause = function() {
    this.source.mediaElement.pause();
}

SourceWidget.prototype.render = function() {
    Widget.prototype.render.call(this);

    this.ctx.fillStyle = "#FFFFFF";
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
        gradient.addColorStop(0, '#00C3FF');
        gradient.addColorStop(0.8, '#FFFF1C');
        this.ctx.fillStyle = gradient;

        var x = i * w;
        var y = v * this.HEIGHT;

        this.ctx.fillRect(x + 1, 0, w - 1, y);
    }
};

function GainWidget(gain) {
    Widget.call(this, "gain", 1024, 64);

    this.gain = gain;
    this.pad = 10;

    this.adjusting = false;

    this.canvas.onmousedown = function() {
        this.adjusting = true;
    }.bind(this);

    this.canvas.onmouseup = function() {
        this.adjusting = false;
    }.bind(this);

    this.canvas.onmousemove = function(evt) {
        if (!this.adjusting) return false;

        var dim = evt.target.getBoundingClientRect();
        var x = evt.clientX - dim.left;

        var v = x / (this.WIDTH - 2 * this.pad);
        this.gain.gain.value = Math.max(0, Math.min(1, v));
    }.bind(this);
};

GainWidget.prototype.render = function() {
    Widget.prototype.render.call(this);

    var gradient = this.ctx.createLinearGradient(0, 0, this.WIDTH, 0);
    gradient.addColorStop(0, '#00C3FF');
    gradient.addColorStop(0.8, '#FFFF1C');
    this.ctx.fillStyle = gradient;

    this.ctx.fillRect(2 * this.pad, this.HEIGHT / 2 - this.pad / 2, this.WIDTH - 4 * this.pad, this.pad);

    var v = this.gain.gain.value * (this.WIDTH - 4 * this.pad);
    this.ctx.beginPath();
    this.ctx.arc(v, this.HEIGHT / 2, 2 * this.pad, 0, 2 * Math.PI);
    this.ctx.fill();
};

function render() {
    for (var i = 0; i < widgets.length; i++) {
        widgets[i].render();
    }

    requestAnimationFrame(render);
}

render();
