export class EnginePack3DBlenderWebSocket {
  websocket: WebSocket | null;
  connected: boolean;
  onOpen: Function;
  onCameraChange: Function;
  onClose: Function;

  constructor(options: { onOpen?: Function, onCameraChange?: Function, onClose?: Function } = {}) {
    this.websocket = null;
    this.connected = false;
    this.onCameraChange = options.onCameraChange ?? (() => {});
    this.onClose = options.onClose ?? (() => {});
    this.onOpen = options.onOpen ?? (() => {});
  }

  close() {
    if (this.websocket) {
      this.websocket.close();
    }
  }

  open() {
    if (this.websocket) {
      return;
    }

    this.websocket = new WebSocket("ws://localhost:8137/");

    this.websocket.addEventListener("open", (event) => {
      this.onOpen(event);
    })

    this.websocket.addEventListener('message', (event) => {
      let data: any = {};

      try {
        data = JSON.parse(event.data);
      } catch (e) { return };

      if (data['Type'] == 'Camera') {
        this.onCameraChange(data);
      } 
    });

    this.websocket.addEventListener("close", (event) => {
      this.onClose(event);
    })    
  }
}