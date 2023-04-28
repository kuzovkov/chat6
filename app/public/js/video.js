class Video {
  src = null;
  params = null;
  parentElement = null;
  video = null;
  container= null;

  constructor(options){
    const default_options = {
      selector: 'body',
      width: 320,
      height: 240,
      id: 0,
      name: 'default',
      controls: true,
      autoplay: true,
      muted: true
    }
    const params = Object.assign({}, default_options, options);
    this.parentElement = document.querySelector(params.selector);
    this.container = document.createElement('div');
    this.container.classList.add('video-element-container');
    this.title = document.createElement('span');
    this.title.classList.add('video-title');
    this.video = document.createElement('video');
    this.video.width = params.width;
    this.video.height = params.height;
    this.video.height = params.height;
    this.video.id = (params.id)? params.id : Math.ceil(Math.random()*1000000);
    this.video.controls = params.controls;
    this.video.autoplay = params.autoplay;
    this.video.muted = params.muted;
    this.container.appendChild(this.title);
    this.container.appendChild(this.video);
  }

  attachStream(stream){
    const myURL = window.URL || window.webkitURL;
    if (!myURL) {
      this.video.src = stream;
    } else {
      //el.src = myURL.createObjectURL(stream);
      this.video.srcObject = stream;
    }
  }

  show(){
    this.parentElement.appendChild(this.container);
  }

  destroy(){
    if (this.container){
      this.container.removeChild(this.video);
      this.parentElement.removeChild(this.container);
      this.video = null;
      this.container = null;
    }
  }

  setTitle(title){
    this.title.innerHTML = title;
  }

  getTitle(){
    return this.title.innerHTML;
  }

}
