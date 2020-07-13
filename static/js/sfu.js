const config = {
  'iceServers': [{
    'urls': ['stun:stun.l.google.com:19302']
  }]
};
const peerConnections = {};
contestents = [];
number_of_persons_in__single_line_canvas = 5;
sizeofframe = 80; //px
canvasfps = 12;
sendingvideofps = 12;
socket=io.connect();
utkid=''
// this should be called first to be called............

const remoteVideos = document.getElementById('remoteVideos');// div
const remoteVideo = document.getElementById('videoreomteVideos');
socket=io.connect();//default domain- starting socket connection between server(flask) and client

addedsfu()
function addedsfu(){
  socket.emit('readysfu');
}

const constraints = { // SFU constraints add video animation.
  video:{width: {max: 320}, height: {max: 240}, frameRate: {max: 1}},
  audio:true
};


navigator.mediaDevices.getUserMedia(constraints)
.then(function(stream){ // if success in getting media devices
const localVideo = document.getElementById('localVideo');//make sendme as localVideo by hook or by crook,
  localVideo.srcObject = stream;// adding stream to video Element.
  canvas = document.getElementById('canvasid');// ==============make sure to remove it by resizing the videos in canvas.===========================
  ctx = canvas.getContext('2d');
  ctx.font = '20px Arial';
  ctx.fillStyle = 'red';
  ctx.textAlign = "center";
  ctx.fillText("Waiting for Other Participants.",canvas.width/2, canvas.height/2);
  send = document.getElementById('sendme');
  var strm = canvas.captureStream(sendingvideofps);
  send.srcObject = strm;

  //=====================================================================AUDIO THING==============================================
  var sources = ["https://upload.wikimedia.org/wikipedia/commons/b/be/Hidden_Tribe_-_Didgeridoo_1_Live.ogg", 
                "https://upload.wikimedia.org/wikipedia/commons/6/6e/Micronesia_National_Anthem.ogg",
                "https://upload.wikimedia.org/wikipedia/commons/a/ac/Cracow_trumpet_signal.ogg"];
  var audio = new AudioContext();
 
  var merger = audio.createChannelMerger();

  var splitter = audio.createChannelSplitter();
  var mixedAudio = audio.createMediaStreamDestination();//cbr

  function get(src) {
    return fetch(src)
      .then(function(response) {
        return response.arrayBuffer()
      })
  }

  Promise.all(sources.map(get)).then(function(data) {
      return Promise.all(data.map(function(buffer, index) {
          return audio.decodeAudioData(buffer)
            .then(function(bufferSource) {
              var source = audio.createBufferSource();
              source.buffer = bufferSource;
              source.connect(splitter);
              splitter.connect(merger);
              return source
            })
        }))
        .then(function(audionodes) {
          merger.connect(mixedAudio);//cbr
          merger.connect(audio.destination);
          audionodes.forEach(function(node) {
            node.start(0)
            strm.addTrack(mixedAudio.stream.getAudioTracks()[0]);
            console.log("Audio added Sucessfully.")
          });
        })
    })

    .catch(function(e) {
      console.log(e)
    });
  //==============================================================================================================================
})
.catch(error => console.log(error));


socket.on('offertojoinsfu', function(message){ // if offer is received
  const send = document.getElementById('sendme');
  console.log('Received Offer from', message['callerid']);
  contestents[contestents.length] = {'id': message['callerid'], 'name': message['name']};
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[message['callerid']] = peerConnection; // write config in ()
  peerConnection.addStream(send.srcObject);
  peerConnection.setRemoteDescription(message['message']) // Remember Local Description and SDP is send throungh the sockets
  .then(() => peerConnection.createAnswer())
  .then(sdp => peerConnection.setLocalDescription(sdp))
  .then(function(){
      socket.emit('answer', {'to': message['callerid'], 'message': peerConnection.localDescription});
      console.log("Answered to", message['callerid']);
  });
  peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, message['callerid']);
  peerConnection.onicecandidate = function(event) {
      if (event.candidate) {
          socket.emit('candidate', {'to': message['callerid'], 'message':event.candidate});
      }
  };
})

function handleRemoteStreamAdded(stream, id){
  const remoteVideos = document.getElementById('remoteVideos'); //DIV.
  const remoteVideo = document.createElement('video');//create video element
  remoteVideo.srcObject = stream;
  document.getElementById('listofpart').innerHTML = contestents['id'];
  remoteVideo.setAttribute("id", id);
  remoteVideo.setAttribute("playsinline", "true");
  remoteVideo.setAttribute("autoplay", "true");
  //remoteVideo.setAttribute('style', "display: none");
  remoteVideos.appendChild(remoteVideo);
  makeincanvas(id);
  // if (remoteVideos.querySelectorAll("video"). === 1) {
  //   remoteVideos.setAttribute("class", "one remoteVideos");
  // } else {
  //   remoteVideos.setAttribute("class", "remoteVideos");
  // }
}

socket.on('candidate', function(mess){
  peerConnections[mess['from']].addIceCandidate(new RTCIceCandidate(mess['message']))
  .catch(e => console.error(e));
});

socket.on('close', function(id){
  handleRemoteHangup(id);
})

function handleRemoteHangup(id) {
  peerConnections[id] && peerConnections[id].close();
  delete peerConnections[id];
  document.querySelector("#" + id).remove();//.replace(/[^a-zA-Z]+/g, "").toLowerCase()).remove();
  if (remoteVideos.querySelectorAll("video").length === 1) {
    remoteVideos.setAttribute("class", "one remoteVideos");
  } else {
    remoteVideos.setAttribute("class", "remoteVideos");
  }
}

function makeincanvas(id){
  c = document.getElementById('canvasid');
  ctx = c.getContext('2d');
  send = document.getElementById('sendme');//video to send.
  var strm = c.captureStream(sendingvideofps);
  
    // console.log('now Audio from-', id);
    // v = document.getElementById(id);
    // let cta = new AudioContext();
    // let dest = cta.createMediaStreamDestination();
    // let sourceNode = cta.createMediaElementSource(v);
    // sourceNode.connect(dest);
    // sourceNode.connect(cta.destination);
    // let audioTrack = dest.stream.getAudioTracks()[0];
    // strm.addTrack(audioTrack);

  send.srcObject = strm;
  setInterval(function(){
    x = 0;
    for(i=1; i<=contestents.length;i++){
        id = contestents[i-1]['id'];
        vid = document.getElementById(id);
        j =  (i-1) % number_of_persons_in__single_line_canvas;
        if (j==0){
          x = x + sizeofframe;
        }
        ctx.drawImage(vid, j*sizeofframe, x, sizeofframe, sizeofframe);
        ctx.fillStyle = 'gray';
        ctx.fillRect(j*sizeofframe, x+(sizeofframe-10), sizeofframe/2, sizeofframe/8);
        ctx.fillStyle = 'white';
        ctx.font = "10px Arial"
        ctx.fillText(contestents[i-1]['name'], j*sizeofframe+15, x+(sizeofframe-1));//edit here
    }
  }, 1000/canvasfps);
}

window.onunload = window.onbeforeunload = function() {
  socket.close();
};
