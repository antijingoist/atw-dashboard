class controller {
  #chartArea;
  #settingsDialog;
  warriorServerConnections;
  warriorServerDisconnects;
  allSettings;
  projects;


  constructor(savedSettings) {
    document.App = this;
    this.#chartArea = document.getElementById('chartArea');
    this.#settingsDialog = document.getElementById('window-settings');
    this.warriorServerDisconnects = {};
    this.warriorServerConnections = new Array();
    this.projects = new Array();

    if(!savedSettings){
      this.allSettings = { nick : "", project: "", reuse: true, warriorServers: {}};
      this.showSettings();
    } else {
      this.allSettings = savedSettings;
      this.restoreSession(this.allSettings);
    }

    document.getElementById('window-settings-save').addEventListener("click", this.saveSettings.bind(this));
    document.getElementById('toolbox-add-node').addEventListener("click", this.showWindow.bind(this));
    document.getElementById('toolbox-change-nick').addEventListener("click", this.showWindow.bind(this));
    document.getElementById('toolbox-reset').addEventListener("click", this.resetSettings.bind(this));

    document.getElementById('window-node-add-addnode').addEventListener("click", this.windowAddNode_buttonAddNode_click.bind(this));
    document.getElementById('window-change-nick-save').addEventListener("click", this.windowChangeNick_buttonSave_click.bind(this));
    var closeButtons = document.getElementsByClassName('close-cancel');
    Array.from(closeButtons).forEach(function(closeButton){
      closeButton.addEventListener("click", document.App.window_closeButton_click);
    });
    this.disconnectsInterval(this.warriorServerDisconnects);
  }

  addDisconnect(disconnectList, serverName, serverURL) {
    console.log(`${serverName} unavailable will check later.`);
    disconnectList[serverName] = serverURL;
  }

  showWindow(e) {
    document.getElementById(e.target.dataset.windowOpen).classList.add("show");
  }

  hideWindow(windowID) {
    document.getElementById(windowID).classList.remove("show");
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

  updateMetrics(name, projects){
    console.log("refreshing metrics...");
    if(projects.length > 0) {
      var statPlace = document.getElementById("metric");
      projects.forEach(project => {
        if(!(document.getElementById(`${project}-metric`))){
          statPlace.innerHTML +=`<div id="${project}-metric"></div>`;
        }
      });
      projects.forEach(project => {
        this.addMetrics(name, project);
      });
    }
 
  }

  addMetrics(name, project) {
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
          var statPlace = document.getElementById(`${project}-metric`);

          if (fullStatData.downloaders.indexOf(name) > 0) {

            for (const [key, value] of Object.entries(fullStatData.downloader_bytes)) {
              downloaderArray.push({ "name": key, "dl": value });
            }
            downloaderArray.sort(function (a, b) {
              return b.dl - a.dl;
            });
            var statPos = downloaderArray.findIndex(e => { return (e.name === name) });
            var gigsDL = this.humanBytes( fullStatData.downloader_bytes[name] );
            var statTotP = fullStatData.downloaders.length;

            var rank = this.getStatRank(statPos, statTotP);
            var rankText = "";
            if (rank != 0 ) {
              rankText = ` (top ${rank}%)`;
            }

            statPlace.innerHTML = `<h1><a href="https://tracker.archiveteam.org/${project}/" target="blank">${project}</a></h1>
                                  <p>Data Saved: <span class=data>${gigsDL.toLocaleString()}</span></p>
                                  <p>Items Saved: <span class=data>${fullStatData.downloader_count[name].toLocaleString()}</span></p>
                                  <p>Position: <span class=data>${statPos} / ${statTotP}${rankText}</span></p>
                                  <p>As of: <span class=data>${currentDate}</span></p>`;
            
          } else {
            statPlace.innerHTML = `<p>Stats for ${name}: ${project} not available yet.</p>`;
          }
          this.updateTimer(name, this.projects);

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

  window_closeButton_click(e) {
    document.App.window_close(document.getElementById(e.target.dataset.windowClose)); 
  }

  windowAddNode_buttonAddNode_click() {
    var server = document.getElementById("serverConnectionString").value.split(",");
    document.getElementById("serverConnectionString").value = "";
    this.addSingleServer(server);
    this.window_close(document.getElementById('window-add-node'));
    localforage.setItem('dashSettings', this.allSettings).then(function(value) {
      console.log(value);
    });
  }

  windowChangeNick_buttonSave_click() {
    var nickName = document.getElementById("window-change-nick-nickname").value;
    this.allSettings.nick = nickName;
    if (this.allSettings.project != ""){
      this.updateMetrics(this.allSettings.nick, this.allSettings.project);
    }
    this.window_close(document.getElementById('window-change-nick'));
  }

  window_close(window) {
    window.classList.add('close');
    setTimeout(() => {
      window.classList.remove('close');
      window.classList.remove('show');
    }, 500);
  }

  addSingleServer(server) {
    this.warriorServerConnections.push(new anwarConnection( server[0].trim(), server[1], this.#chartArea, this));
    this.allSettings.warriorServers[server[0]] = server[1];
  }

  restoreSession(settings) {
    var warriorServers = settings.warriorServers;
    if(Object.keys(warriorServers).length > 0) {
      for(const item in warriorServers) {
        this.warriorServerConnections.push(new anwarConnection( item, warriorServers[item], this.#chartArea, this));
      }
    }
  }

  resetSettings() {
    localforage.clear().then(function() {
      window.location.reload();
    });
  }

  updateTimer(nick, project) {
    setTimeout(() => {
      this.updateMetrics(nick, this.projects);
    }, 300000);
  }

  setProject(project) {
    var np = project.replace(/\s/g, '');
    console.log(this.projects);
    if(!(this.projects.includes(np))){
      this.projects.push(np);
      this.allSettings.project = np;
      this.updateMetrics(this.allSettings.nick, this.projects);
    } 
  }

  getStatRank(pos, total) {
    var percent = (pos / total) * 100;
    var rank = 0;
    var ranks = [50,25,10,5,1];

    ranks.forEach(r =>{
      if (percent <= r){
        rank = r;
      }
    })

    return rank;
  }

}