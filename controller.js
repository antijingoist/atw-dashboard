class controller {
  #chartArea;
  #settingsDialog;
  warriorServerConnections;
  warriorServerDisconnects;
  #topLevel;
  allSettings;


  constructor() {
    this.#topLevel = this;
    this.allSettings = { nick : "", project: "", reuse: true};
    this.#chartArea = document.getElementById('chartArea');
    this.#settingsDialog = document.getElementById('settings');
    this.warriorServerDisconnects = {};
    this.warriorServerConnections = new Array();
    
    this.showSettings();
    document.getElementById('settingsSave').addEventListener("click", this.saveSettings.bind(this));
    this.disconnectsInterval(this.warriorServerDisconnects);
  }

  addDisconnect(disconnectList, serverName, serverURL) {
    console.log(`${serverName} unavailable will check later.`);
    disconnectList[serverName] = serverURL;
  }

  showSettings(){
    this.#settingsDialog.classList.add("show");
  }

  hideSettings() {
    this.#settingsDialog.classList.remove("show");
  }

  saveSettings() {
    this.allSettings.nick = document.getElementById("inputNickName").value;    
    var warriorServerString = document.getElementById("inputServerList").value;
    var warriorServers = warriorServerString.split("\n");
    var warriorServer = new Array;

    warriorServers.forEach(serverItem => {
      warriorServer = serverItem.split(",");
      this.addSingleServer(warriorServer);
    });
    this.window_close(this.#settingsDialog);
    this.updateMetrics(this.allSettings.nick, this.allSettings.project);
    localforage.setItem('dashSettings', this.allSettings).then(function(value) {
      console.log(value);
    });
  }

  updateMetrics(name, project) {
    if (project) {
      fetch(`https://legacy-api.arpa.li/${project}/stats.json`, {
        "method": "GET",
        "headers": {}
      })
        .then((res) => res.text())
        .then((stats) => {

          var downloaderArray = new Array();
          var currentDate = new Date().toLocaleString();
          var fullStatData = JSON.parse(stats);
          if (fullStatData.downloaders.indexOf(name) > 0) {
            var statPlace = document.getElementById("metric");

            for (const [key, value] of Object.entries(fullStatData.downloader_bytes)) {
              downloaderArray.push({ "name": key, "dl": value });
            }
            downloaderArray.sort(function (a, b) {
              return b.dl - a.dl;
            });
            var statPos = downloaderArray.findIndex(e => { return (e.name === name) });
            var gigsDL = this.humanBytes( fullStatData.downloader_bytes[name] );
            var statTotP = fullStatData.downloaders.length;
            statPlace.innerHTML = `<h1>Downloading: ${project}</h1>
                                  <p>Data Saved: <span class=data>${gigsDL.toLocaleString()}</span></p>
                                  <p>Items Saved: <span class=data>${fullStatData.downloader_count[name].toLocaleString()}</span></p>
                                  <p>Position: <span class=data>${statPos} / ${statTotP}</span></p>
                                  <p>As of: <span class=data>${currentDate}</span></p>`;
            this.updateTimer(name, project);
          }


        })
        .then(console.log.bind(console))
        .catch(console.error.bind(console));
    }
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

  disconnectsInterval(list) {
    setInterval(()=> {
      if(Object.keys(list).length > 0) {
        for(const item in list) {
          if(this.allSettings.sort){
            document.getElementById(item).remove();
          }
          this.warriorServerConnections.push(new anwarConnection( item, list[item], this.#chartArea, this, this.allSettings.reuse));

          delete list[item];
        }
      }
    }, 60000);

  }

  updateTimer(nick, project) {
    setTimeout(() => {
      this.updateMetrics(nick, project);
    }, 300000);
  }

  setProject(project) {
    this.allSettings.project = project;
    this.updateMetrics(this.allSettings.nick, this.allSettings.project);
  }

}