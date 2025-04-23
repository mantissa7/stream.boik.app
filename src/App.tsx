import "./index.css";

export function App() {
  return (
    <div className="app">
      {/* <iframe
        src="https://player.twitch.tv/?hatfilms&parent=localhost"
        height="100%"
        width="100%"
        allowfullscreen="true">
      </iframe> */}
      <div className="vid">
        <iframe src="https://www.youtube.com/embed/live_stream?channel=UC7A_dLnSAjl7uROCdoNyjzg" width="100%" height="100%" title="stream" />
        <div>box</div>
      </div>
      <div className="chat">
        <iframe
          src="https://www.twitch.tv/embed/hatfilms/chat?parent=stream.boik.app&darkpopout"
          height="100%"
          width="100%"
          title="chat"
        />
      </div>
    </div>
  );
}

export default App;
