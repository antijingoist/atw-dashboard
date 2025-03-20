class anwarConnection {
  #serverURL;
  #instName;
  projectName;
  serverConnection;
  eventCallbacks;
  sending;
  receiving;
  bandwidthChart;
  controller;


  constructor(name, serverURL, objectInsertInto, controllerObject, reuse=false) {
    this.eventCallbacks = {};
    this.#serverURL = serverURL; 
    this.#instName = name;
    this.controller = controllerObject;
    this.projectName = "";

    this.serverConnection = new SockJS(this.#serverURL);
    if(!(reuse)){
      objectInsertInto.append(this.createChartArea(name, this.#serverURL));
    }

    let para = this;

    this.serverConnection.onopen = function () {
      document.getElementById(name).classList.add("connected");
      para.createChart(name);
      para.sending = new TimeSeries();
      para.receiving = new TimeSeries();
      para.bandwidthChart.addTimeSeries(para.receiving, { strokeStyle: '#459B34', fillStyle:'rgba(0,138,92,0.30)' });
      para.bandwidthChart.addTimeSeries(para.sending);
      para.consoleLog(name, 'Connected.');
    }

    this.serverConnection.onclose = function () {
      if (document.getElementById(name).classList.contains("connected")) {
        document.getElementById(name).classList.remove("connected");
      }
      para.controller.addDisconnect(para.controller.warriorServerDisconnects, para.#instName, para.#serverURL);
      para.consoleLog(para.#instName, 'Disconnected. Reconnect attempt in 1 min');

    }

    this.serverConnection.onmessage = function(event, lpara = para) {
      var dataDoc = JSON.parse(event.data);
      //para.eventCallbacks[dataDoc.event_name](dataDoc.message);
      if (dataDoc.event_name === "bandwidth"){
        let msg = dataDoc.message;
        lpara.sending.append(new Date().getTime(), msg.sending / 1024);
        lpara.receiving.append(new Date().getTime(), msg.receiving / 1024);
        document.getElementById(`bandwidth-sending-${name}`).innerHTML = lpara.humanBytes(msg.sending) + '/s';
        document.getElementById(`bandwidth-receiving-${name}`).innerHTML = lpara.humanBytes(msg.receiving) + '/s';
        document.getElementById(`bandwidth-sent-${name}`).innerHTML = lpara.humanBytes(msg.sent);
        document.getElementById(`bandwidth-received-${name}`).innerHTML =lpara.humanBytes(msg.received);
      } else {
        if (dataDoc.event_name != "timestamp") {
          if(dataDoc.message.data){
            var consoleDiv = document.getElementById("console");
            var msgData = document.createElement("p");
            var timeStamp = new Date().toLocaleString();
            msgData.innerHTML = `<span class="instName ${name}">${name}</span>: <span class="msg">${dataDoc.message.data}</span> - <span class="timestamp">${timeStamp}</span>`;
            consoleDiv.appendChild(msgData);
            consoleDiv.scrollTop = consoleDiv.scrollHeight;
            if(consoleDiv.childNodes.length > 50){
              consoleDiv.removeChild(consoleDiv.firstElementChild);
            }
          }

        }
        if (dataDoc.event_name === "item.output") {
          if (dataDoc.message.data.startsWith("Project code is out of date and needs to be upgraded") || 
              dataDoc.message.data.startsWith("No HTTP response")) {
            document.getElementById(name).classList.add("error");
          } else {
            if (document.getElementById(name).classList.contains("error")) {
              document.getElementById(name).classList.remove("error");
            }
          }
        }
        if (dataDoc.event_name="project.refresh"){
          if(dataDoc.message.project) {
            para.controller.setProject(dataDoc.message.project.title.toLowerCase());
          }
        }
      }

    }
  }

  connectionAttempt(serverConnection, serverURL) {
    serverConnection = new SockJS(serverURL);
  }

  consoleLog(name, msg) {
    var consoleDiv = document.getElementById("console");
    var msgData = document.createElement("p");
    var timeStamp = new Date().toLocaleString();
    msgData.innerHTML = `<span class="instName ${name}">${name}</span>: <span class="msg">${msg}</span> - <span class="timestamp">${timeStamp}</span>`;
    consoleDiv.appendChild(msgData);
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
    if(consoleDiv.childNodes.length > 50){
      consoleDiv.removeChild(consoleDiv.firstElementChild);
    }
  }

  createChart(name) {
    this.bandwidthChart = new SmoothieChart(
      {
        minValue: 0,
        millisPerPixel: 100,
        grid: {
          fillStyle: '#000000',
          strokeStyle: '#444444',
          lineWidth: 1,
          millisPerLine: 2000,
          verticalSections: 3
        }
      });
    this.bandwidthChart.streamTo(document.getElementById(`bandwidth-canvas-${name}`), 1000);
  }

  createChartArea(name, url) {
    let chartContent = `
          <div class=legend>
            <div id="${name}-heading" class=heading>
              <h2><a href='${url}' target="_blank">${name}</a></h2>
              <h2 class="isOffline">Offline</a>
            </div>
            <div class="bandwidth sending" id="bandwidth-sending-${name}"></div>
            <div class="bandwidth receiving" id="bandwidth-receiving-${name}"></div>
            <div class="bandwidth sent" id="bandwidth-sent-${name}"></div>
            <div class="bandwidth received" id="bandwidth-received-${name}"></div>
          </div>
          <canvas id="bandwidth-canvas-${name}" width="300" height="250"></canvas>
    `;

    let newChartArea = document.createElement("div");
    newChartArea.id = name;
    newChartArea.className = "chartSet";
    newChartArea.innerHTML = chartContent;

    return newChartArea;
  }

  humanBytes(bytes) {
    if (bytes > 1024 * 1024 * 1024) {
      return (Math.round(10 * bytes / (1024 * 1024 * 1024)) / 10) + ' GB';
    } else if (bytes > 1024 * 1024) {
      return (Math.round(10 * bytes / (1024 * 1024)) / 10) + ' MB';
    } else {
      return (Math.round(10 * bytes / (1024)) / 10) + ' kB';
    }
  }

}