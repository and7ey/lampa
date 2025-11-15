(function () {
    'use strict';

    function Component(object) {
      var html = Lampa.Template.js('dlna_client_main'),
          head = html.find('.dlna_client-main__head'),
          body = html.find('.dlna_client-main__body');
      var listener_id, server, scroll, tree, image;

      this.create = function () {
        this.activity.loader(true);
        server = Lampa.Storage.get('synology_dlna_server');

        if (server !== undefined && server !== null && server !== '') {
          scroll = new Lampa.Scroll({
            mask: true,
            over: true
          });
          scroll.minus(head);
          body.append(scroll.render(true));
          tree = {
            device: {name: server},
            tree: [{title:"/video", id: 1}]
          };
          this.displayFolder();
        } else {
          var empty = new Lampa.Empty({
            descr: Lampa.Lang.translate('synology_dlna_client_no_address')
          });
          html.empty();
          html.append(empty.render(true));
          this.start = empty.start;
        }

        this.activity.loader(false);
      };

      this.drawLoading = function (text) {
        scroll.clear();
        scroll.reset();
        Lampa.Controller.clear();
        var load = Lampa.Template.js('dlna_client_loading');
        load.find('.dlna_client-loading__title').text(text);
        scroll.append(load);
      };

      // local proxy is needed for Synology NAS with old upnp sdk used (CORS restricted)
      // UPnP/1.0, Portable SDK for UPnP devices/1.6.18: https://github.com/pupnp/pupnp/commit/542c318acff73bf9be85b886a6e447bc473f57f2 
      this.getProxyURL = function (url) {
        var proxy = Lampa.Storage.get('synology_dlna_proxy');
        if (proxy) {
          if (proxy.indexOf('http') === -1) proxy = 'http://' + proxy;  
          url = proxy + (proxy.endsWith('/') ? '' : '/') + url;
        }
        return url;        
      }

      this.drawFolder = function (elems) {
        var _this2 = this;

        scroll.clear();
        scroll.reset();
        var folders = elems.filter(function (a) {
          return a.type === 'object.container.storageFolder';
        });
        var files = elems.filter(function (a) {
          return a.type === 'object.item.videoItem'
          || a.type === 'object.item.audioItem.musicTrack'
          || a.type === 'object.item.imageItem.photo';
        });
        folders.forEach(function (element) {
          var item = Lampa.Template.js('dlna_client_folder');
          item.find('.dlna_client-device__name').text(element.title);
          item.on('hover:enter', function () {
            tree.tree.push(element);
            _this2.displayFolder();
          });
          item.on('hover:focus', function () {
            scroll.update(item);
          });
          scroll.append(item);
        });

        if (files.length) {
          var spl = document.createElement('div');
          spl.addClass('dlna_client-main__split');
          spl.text(Lampa.Lang.translate('title_files'));
          scroll.append(spl);
          files.forEach(function (element) {
            var item = Lampa.Template.js('dlna_client_file');
            var icon = '';
            if(element.type==='object.item.videoItem') {
              icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 477.867 477.867" xml:space="preserve"><path d="M238.933 0C106.974 0 0 106.974 0 238.933s106.974 238.933 238.933 238.933 238.933-106.974 238.933-238.933C477.726 107.033 370.834.141 238.933 0zm100.624 246.546a17.068 17.068 0 0 1-7.662 7.662v.085L195.362 322.56c-8.432 4.213-18.682.794-22.896-7.638a17.061 17.061 0 0 1-1.8-7.722V170.667c-.004-9.426 7.633-17.07 17.059-17.075a17.068 17.068 0 0 1 7.637 1.8l136.533 68.267c8.436 4.204 11.867 14.451 7.662 22.887z" fill="currentColor"></path></svg>';
            }
            if(element.type==='object.item.imageItem.photo') {
              icon ='<svg fill="currentColor" height="800px" width="800px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 489.4 489.4" xml:space="preserve"><g><g><path d="M0,437.8c0,28.5,23.2,51.6,51.6,51.6h386.2c28.5,0,51.6-23.2,51.6-51.6V51.6c0-28.5-23.2-51.6-51.6-51.6H51.6  C23.1,0,0,23.2,0,51.6C0,51.6,0,437.8,0,437.8z M437.8,464.9H51.6c-14.9,0-27.1-12.2-27.1-27.1v-64.5l92.8-92.8l79.3,79.3  c4.8,4.8,12.5,4.8,17.3,0l143.2-143.2l107.8,107.8v113.4C464.9,452.7,452.7,464.9,437.8,464.9z M51.6,24.5h386.2  c14.9,0,27.1,12.2,27.1,27.1v238.1l-99.2-99.1c-4.8-4.8-12.5-4.8-17.3,0L205.2,333.8l-79.3-79.3c-4.8-4.8-12.5-4.8-17.3,0  l-84.1,84.1v-287C24.5,36.7,36.7,24.5,51.6,24.5z"/><path d="M151.7,196.1c34.4,0,62.3-28,62.3-62.3s-28-62.3-62.3-62.3s-62.3,28-62.3,62.3S117.3,196.1,151.7,196.1z M151.7,96  c20.9,0,37.8,17,37.8,37.8s-17,37.8-37.8,37.8s-37.8-17-37.8-37.8S130.8,96,151.7,96z"/></g></g></svg>';
            }
            if (element.type === 'object.item.audioItem.musicTrack') {
              icon = '<svg height="800px" width="800px" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve"><style type="text/css"></style><g><path fill="currentColor" d="M378.409,0H208.294h-13.175l-9.314,9.314L57.016,138.102l-9.314,9.314v13.176v265.513  c0,47.361,38.528,85.896,85.896,85.896h244.811c47.36,0,85.888-38.535,85.888-85.896V85.895C464.298,38.528,425.769,0,378.409,0z  M432.493,426.104c0,29.877-24.214,54.092-54.084,54.092H133.598c-29.878,0-54.092-24.215-54.092-54.092V160.591h83.717  c24.885,0,45.07-20.179,45.07-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.091V426.104z"/><path fill="currentColor" d="M288.59,223.362c-22.63-10.927-41.75-35.596-41.75-35.596v16.429V324.36  c-7.062-2.598-15.417-3.365-24.029-1.704c-20.674,3.972-34.908,20.283-31.801,36.412c3.107,16.136,22.382,25.988,43.052,22.001  c18.356-3.533,31.605-16.786,32.174-31.015h0.112V246.626c59.377,7.254,49.623,49.281,45.517,61.604  C346.085,269.898,328.287,242.521,288.59,223.362z"/></g></svg>';
            }
            var add = '';
            add += element.resolution ? element.resolution+' ' : '';
            add += element.duration ? element.duration+' ' : '';
            item.find('.dlna_client-file__icon').html(icon);
            item.find('.dlna_client-file__name').text(element.title);
            item.find('.dlna_client-file__size').text(add+Lampa.Utils.bytesToSize(element.size));

            item.on('hover:enter', function () {
              if(element.type==='object.item.imageItem.photo') {
                var folder = tree.tree[tree.tree.length - 1];
                if(folder.image) {
                  return;
                }
                // create image tag at fullscreen and wait bach or esc for close
                var img = document.createElement('img');
                img.src = _this2.getProxyURL(element.url);
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.style.position = 'absolute';
                img.style.top = '0';
                img.style.left = '0';
                img.style.zIndex = '1000';
                img.style.backgroundColor = 'black';
                img.style.cursor = 'pointer';
                // show image
                var body = document.getElementsByTagName('body')[0];
                body.append(img);
                image = img;
                return;
              }
              var video = {
                title: element.title,
                url: _this2.getProxyURL(element.url)
              };
              Lampa.Player.play(video);
              Lampa.Player.playlist([video]);
            });
            item.on('hover:focus', function () {
              scroll.update(item);
            });
            scroll.append(item);
          });
        }

        this.drawHead();
        this.activity.toggle();
      };

      this.drawHead = function () {
        head.empty();
        var nav = [];
        var device_item = document.createElement('div');
        device_item.addClass('dlna_client-head__device');
        var icon = "<svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" viewBox=\"0 0 128 128\" xml:space=\"preserve\">\n                <path d=\"M111.7 57.1V22.2c0-1.1-.5-2.3-1.4-2.9h-.1c-.6-.4-1.2-.6-2-.6H30.9c-2 0-3.5 1.5-3.5 3.5v31.9h34.9c2.8 0 5.1 2.4 5.1 5.2v15.5h27.5V61.4c0-2.4 1.9-4.2 4.2-4.2h12.6z\" fill=\"currentColor\"></path>\n                <path d=\"M96.8 67.6H128v33.2H96.8zM67.3 86.1h27.5v-9.2H67.3zM65.1 59.3c0-1.8-1.3-3.1-3-3.1h-56c-1.7 0-3 1.4-3 3.1v41.9h62zM0 106.1c0 1.7 1.3 3.1 3.1 3.1h62.2c1.7 0 3.1-1.3 3.1-3.1v-2.9H0zM125.8 59.3H99c-1.2 0-2.2.9-2.2 2.2v4.1H128v-4.1c0-1.3-.9-2.2-2.2-2.2zm-9.4 4.1h-7.9c-.6 0-1-.4-1-1s.4-1 1-1h7.9c.6 0 1 .4 1 1 .1.6-.3 1-1 1zm3.8 0h-.4c-.6 0-1-.4-1-1s.4-1 1-1h.4c.6 0 1 .4 1 1s-.4 1-1 1zM96.8 107.1c0 1.2.9 2.2 2.2 2.2h26.8c1.2 0 2.2-1 2.2-2.2V103H96.8zm11.6-2h7.9c.6 0 1 .4 1 1s-.4 1-1 1h-7.9c-.6 0-1-.4-1-1s.4-1 1-1zM81.7 93.7H78v-5.6H67.3v7.6h14.3c.6 0 1-.4 1-1 .1-.6-.3-1-.9-1z\" fill=\"currentColor\"></path>\n            </svg>";
        icon += '<span>' + tree.device.name + '</span>';
        device_item.html(icon);
        nav.push(device_item);
        tree.tree.forEach(function (folder) {
          if (folder.isRootFolder) return;
          var folder_item = document.createElement('div');
          folder_item.text(folder.title);
          folder_item.addClass('dlna_client-head__folder');
          nav.push(folder_item);
        });

        for (var i = 0; i < nav.length; i++) {
          if (i > 0) {
            var spl = document.createElement('div');
            spl.addClass('dlna_client-head__split');
            head.append(spl);
          }

          head.append(nav[i]);
        }
      };

      this.displayFolder = function () {
        var _this3 = this;

        var device = tree.device;
        var folder = tree.tree[tree.tree.length - 1];
        this.drawLoading(Lampa.Lang.translate('loading'));

        var serviceURL = device.name + (device.name.endsWith('/') ? '' : '/') + 'ContentDirectory/control';
        if (serviceURL.indexOf('http') === -1) serviceURL = 'http://' + serviceURL;

        serviceURL = this.getProxyURL(serviceURL);

        console.log('SynoDLNA', serviceURL);

        var soapAction = '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"';
        var soapBody = `
          <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
              <s:Body>
                  <u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
                      <ObjectID>`+folder.id+`</ObjectID>
                      <BrowseFlag>BrowseDirectChildren</BrowseFlag>
                      <Filter>*</Filter>
                      <StartingIndex>0</StartingIndex>
                      <RequestedCount>1000</RequestedCount>
                      <SortCriteria></SortCriteria>
                  </u:Browse>
              </s:Body>
          </s:Envelope>`;
        $.ajax({
          url: serviceURL,
          type: "POST",
          dataType: "xml",
          data: soapBody,
          headers: {
            "SOAPAction": soapAction,
            "Content-Type": "text/xml"
          },
          success: function(response) {
            var filesAndDirectories = _this3.parseXmlResponse(response.documentElement.outerHTML);
            //console.log('SynoDLNA', filesAndDirectories);
            _this3.drawFolder(filesAndDirectories);
          },
          error: function() {
            console.log('SynoDLNA', "SOAP request failed");
          }
        });
      };

      this.parseXmlResponse = function (xmlResponse) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xmlResponse, "text/xml");
        var result = xmlDoc.getElementsByTagName('Result')[0].textContent;
        var decodedResult = decodeURIComponent(result);
        var resultDoc = parser.parseFromString(decodedResult, "text/xml");
        var containers = resultDoc.getElementsByTagName('container');
        var items = resultDoc.getElementsByTagName('item');
        var filesAndDirectories = [];
        var parseNode = function(node) {
          var nodeInfo = {};
          for (var i = 0; i < node.attributes.length; i++) {
            nodeInfo[node.attributes[i].name] = node.attributes[i].value;
          }
          for (var i = 0; i < node.childNodes.length; i++) {
            if (node.childNodes[i].nodeType === 1) { // if element node
              var name = node.childNodes[i].nodeName
              if(name === 'dc:title') name = 'title';
              if(name === 'upnp:class') name = 'type';
              if(name === 'res') name = 'url';
              if(nodeInfo[name]) continue;
              nodeInfo[name] = node.childNodes[i].textContent;
              for (var j = 0; j < node.childNodes[i].attributes.length; j++) {
                 nodeInfo[node.childNodes[i].attributes[j].name] = node.childNodes[i].attributes[j].value;
              }
            }
          }
          return nodeInfo;
        };
        for (var i = 0; i < containers.length; i++) {
          filesAndDirectories.push(parseNode(containers[i]));
        }
        for (var i = 0; i < items.length; i++) {
          filesAndDirectories.push(parseNode(items[i]));
        }
        return filesAndDirectories;
      }

      this.back = function () {
        if (image) {
          image.remove();
          image = false;
          return;
        }
        if (tree) {
          if (tree.tree.length > 1) {
            tree.tree.pop();
            this.displayFolder();
          }
        } else {
          Lampa.Activity.backward();
        }
      };

      this.background = function () {
        Lampa.Background.immediately('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAZCAYAAABD2GxlAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAHASURBVHgBlZaLrsMgDENXxAf3/9XHFdXNZLm2YZHQymPk4CS0277v9+ffrut62nEcn/M8nzb69cxj6le1+75f/RqrZ9fatm3F9wwMR7yhawilNke4Gis/7j9srQbdaVFBnkcQ1WrfgmIIBcTrvgqqsKiTzvpOQbUnAykVW4VVqZXyyDllYFSKx9QaVrO7nGJIB63g+FAq/xhcHWBYdwCsmAtvFZUKE0MlVZWCT4idOlyhTp3K35R/6Nzlq0uBnsKWlEzgSh1VGJxv6rmpXMO7EK+XWUPnDFRWqitQFeY2UyZVryuWlI8ulLgGf19FooAUwC9gCWLcwzWPb7Wa60qdlZxjx6ooUuUqVQsK+y1VoAJyBeJAVsLJeYmg/RIXdG2kPhwYPBUQQyYF0XC8lwP3MTCrYAXB88556peCbUUZV7WccwkUQfCZC4PXdA5hKhSVhythZqjZM0J39w5m8BRadKAcrsIpNZsLIYdOqcZ9hExhZ1MH+QL+ciFzXzmYhZr/M6yUUwp2dp5U4naZDwAF5JRSefdScJZ3SkU0nl8xpaAy+7ml1EqvMXSs1HRrZ9bc3eZUSXmGa/mdyjbmqyX7A9RaYQa9IRJ0AAAAAElFTkSuQmCC');
      };

      this.start = function () {
        if (Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) return;
        this.background();
        Lampa.Controller.add('content', {
          invisible: true,
          toggle: function toggle() {
            Lampa.Controller.collectionSet(html);
            Lampa.Controller.collectionFocus(false, html);
          },
          left: function left() {
            if (Navigator.canmove('left')) Navigator.move('left');else Lampa.Controller.toggle('menu');
          },
          up: function up() {
            if (Navigator.canmove('up')) Navigator.move('up');else Lampa.Controller.toggle('head');
          },
          right: function right() {
            Navigator.move('right');
          },
          down: function down() {
            Navigator.move('down');
          },
          back: this.back.bind(this)
        });
        Lampa.Controller.toggle('content');
      };

      this.pause = function () {};

      this.stop = function () {};

      this.render = function () {
        return html;
      };

      this.destroy = function () {
        //if (deviceFinder) deviceFinder.removeDeviceDiscoveryListener(listener_id);
        if (scroll) scroll.destroy();
        html.remove();
      };
    }

    function startPlugin() {
      window.plugin_synology_dlna_client = true;
      Lampa.Lang.add({
        synology_dlna_client_no_address: {
          ru: 'Введите адрес DLNA сервера в настройках',
          en: 'Enter the address of the DLNA server in the settings',
          uk: 'Введіть адресу DLNA сервера в налаштуваннях',
          be: 'Увядзіце адрас DLNA сервера ў наладах',
          zh: '在设置中输入DLNA服务器的地址',
          pt: 'Digite o endereço do servidor DLNA nas configurações'
        }
      });
      var manifest = {
        type: 'plugin',
        version: '1.0.1',
        name: 'SynoDLNA',
        description: 'Synology DLNA client for Lampa',
        component: 'synology_dlna_client'
      };

      Lampa.Manifest.plugins = manifest;
      Lampa.Template.add('dlna_client_main', "\n        <div class=\"dlna_client-main\">\n            <div class=\"dlna_client-main__head dlna_client-head\"></div>\n            <div class=\"dlna_client-main__body\"></div>\n        </div>\n    ");
      Lampa.Template.add('dlna_client_loading', "\n        <div class=\"dlna_client-loading\">\n            <div class=\"dlna_client-loading__title\"></div>\n            <div class=\"dlna_client-loading__loader\">\n                <div class=\"broadcast__scan\"><div></div></div>\n            </div>\n        </div>\n    ");
      Lampa.Template.add('dlna_client_device', "\n        <div class=\"dlna_client-device selector\">\n            <div class=\"dlna_client-device__body\">\n                <div class=\"dlna_client-device__icon\">\n                    <svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" viewBox=\"0 0 128 128\" xml:space=\"preserve\">\n                        <path d=\"M111.7 57.1V22.2c0-1.1-.5-2.3-1.4-2.9h-.1c-.6-.4-1.2-.6-2-.6H30.9c-2 0-3.5 1.5-3.5 3.5v31.9h34.9c2.8 0 5.1 2.4 5.1 5.2v15.5h27.5V61.4c0-2.4 1.9-4.2 4.2-4.2h12.6z\" fill=\"currentColor\"></path>\n                        <path d=\"M96.8 67.6H128v33.2H96.8zM67.3 86.1h27.5v-9.2H67.3zM65.1 59.3c0-1.8-1.3-3.1-3-3.1h-56c-1.7 0-3 1.4-3 3.1v41.9h62zM0 106.1c0 1.7 1.3 3.1 3.1 3.1h62.2c1.7 0 3.1-1.3 3.1-3.1v-2.9H0zM125.8 59.3H99c-1.2 0-2.2.9-2.2 2.2v4.1H128v-4.1c0-1.3-.9-2.2-2.2-2.2zm-9.4 4.1h-7.9c-.6 0-1-.4-1-1s.4-1 1-1h7.9c.6 0 1 .4 1 1 .1.6-.3 1-1 1zm3.8 0h-.4c-.6 0-1-.4-1-1s.4-1 1-1h.4c.6 0 1 .4 1 1s-.4 1-1 1zM96.8 107.1c0 1.2.9 2.2 2.2 2.2h26.8c1.2 0 2.2-1 2.2-2.2V103H96.8zm11.6-2h7.9c.6 0 1 .4 1 1s-.4 1-1 1h-7.9c-.6 0-1-.4-1-1s.4-1 1-1zM81.7 93.7H78v-5.6H67.3v7.6h14.3c.6 0 1-.4 1-1 .1-.6-.3-1-.9-1z\" fill=\"currentColor\"></path>\n                    </svg>\n                </div>\n                <div class=\"dlna_client-device__name\"></div>\n                <div class=\"dlna_client-device__ip\"></div>\n            </div>\n        </div>\n    ");
      Lampa.Template.add('dlna_client_folder', "\n        <div class=\"dlna_client-device selector\">\n            <div class=\"dlna_client-device__body\">\n                <div class=\"dlna_client-device__icon\">\n                    <svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" viewBox=\"0 0 408 408\" style=\"enable-background:new 0 0 512 512\" xml:space=\"preserve\">\n                        <path d=\"M372 88.661H206.32l-33-39.24a5.001 5.001 0 0 0-4-1.8H36c-19.956.198-36.023 16.443-36 36.4v240c-.001 19.941 16.06 36.163 36 36.36h336c19.94-.197 36.001-16.419 36-36.36v-199c.001-19.941-16.06-36.162-36-36.36z\" fill=\"currentColor\"></path>\n                    </svg>\n                </div>\n                <div class=\"dlna_client-device__name\"></div>\n            </div>\n        </div>\n    ");
      Lampa.Template.add('dlna_client_file', "\n        <div class=\"dlna_client-file selector\">\n            <div class=\"dlna_client-file__body\">\n                <div class=\"dlna_client-file__icon\">\n                    <svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" viewBox=\"0 0 477.867 477.867\" xml:space=\"preserve\">\n                        <path d=\"M238.933 0C106.974 0 0 106.974 0 238.933s106.974 238.933 238.933 238.933 238.933-106.974 238.933-238.933C477.726 107.033 370.834.141 238.933 0zm100.624 246.546a17.068 17.068 0 0 1-7.662 7.662v.085L195.362 322.56c-8.432 4.213-18.682.794-22.896-7.638a17.061 17.061 0 0 1-1.8-7.722V170.667c-.004-9.426 7.633-17.07 17.059-17.075a17.068 17.068 0 0 1 7.637 1.8l136.533 68.267c8.436 4.204 11.867 14.451 7.662 22.887z\" fill=\"currentColor\"></path>\n                    </svg>\n                </div>\n                <div class=\"dlna_client-file__name\"></div>\n                <div class=\"dlna_client-file__size\"></div>\n            </div>\n        </div>\n    ");
      Lampa.Template.add(manifest.component + '_style', "\n        <style>\n        .dlna_client-main__wrap::after{content:'';display:block;clear:both}.dlna_client-main__split{clear:both;padding:1.2em;font-size:1.4em}.dlna_client-head{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap;line-height:1.4;font-size:1.2em;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;min-height:4.1em;padding:.7em;padding-bottom:0}.dlna_client-head>*{margin:.5em;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;padding:.4em 1em;-o-text-overflow:ellipsis;text-overflow:ellipsis;max-width:20em;overflow:hidden;white-space:nowrap;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.dlna_client-head__device{background-color:#404040;font-weight:600;margin-right:1.4em}.dlna_client-head__device>svg{width:1.5em !important;height:1.5em !important;margin-right:1em;vertical-align:middle;opacity:.5}.dlna_client-head__split{padding:0;margin:0;overflow:inherit}.dlna_client-head__split::before{content:'';display:block;width:.3em;height:.3em;border-right:.2em solid #fff;border-bottom:.2em solid #fff;-webkit-transform:rotate(-45deg);-moz-transform:rotate(-45deg);-ms-transform:rotate(-45deg);-o-transform:rotate(-45deg);transform:rotate(-45deg);opacity:.5;margin-top:.15em}.dlna_client-device{float:left;width:33.3%;padding:1.5em;line-height:1.4}.dlna_client-device__body{background-color:#404040;-webkit-border-radius:1em;-moz-border-radius:1em;border-radius:1em;padding:1.5em;position:relative;min-height:12.5em}.dlna_client-device__name{font-weight:600;font-size:1.4em;margin-bottom:.4em;overflow:hidden;-o-text-overflow:'.';text-overflow:'.';display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}.dlna_client-device__ip{opacity:.5}.dlna_client-device__icon{opacity:.5;margin-bottom:1em}.dlna_client-device__icon svg{width:4em !important;height:4em !important}.dlna_client-device.focus .dlna_client-device__body::after,.dlna_client-device.hover .dlna_client-device__body::after{content:'';position:absolute;top:-0.5em;left:-0.5em;right:-0.5em;bottom:-0.5em;border:.3em solid #fff;-webkit-border-radius:1.4em;-moz-border-radius:1.4em;border-radius:1.4em;z-index:-1;pointer-events:none}.dlna_client-loading{margin:0 auto;padding:1.5em;text-align:center}.dlna_client-loading__title{font-size:1.4em;margin-bottom:2em}.dlna_client-file{padding:1.5em;line-height:1.4;padding-bottom:0}.dlna_client-file__body{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;background-color:#404040;-webkit-border-radius:1em;-moz-border-radius:1em;border-radius:1em;padding:1.5em;position:relative}.dlna_client-file__icon{opacity:.5;margin-right:2em}.dlna_client-file__icon svg{width:3em !important;height:3em !important}.dlna_client-file__name{font-weight:600;font-size:1.4em;overflow:hidden;-o-text-overflow:'.';text-overflow:'.';display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}.dlna_client-file__size{padding-left:2em;margin-left:auto}.dlna_client-file.focus .dlna_client-file__body::after,.dlna_client-file.hover .dlna_client-file__body::after{content:'';position:absolute;top:-0.5em;left:-0.5em;right:-0.5em;bottom:-0.5em;border:.3em solid #fff;-webkit-border-radius:1.4em;-moz-border-radius:1.4em;border-radius:1.4em;z-index:-1;pointer-events:none}\n        </style>\n    ");

      function add() {
        // https://github.com/yumata/lampa-source/blob/main/src/components/settings/api.js
        Lampa.SettingsApi.addComponent({
          component: 'synology_dlna_client_config',
          name: 'SynoDLNA',
          icon: "<svg viewBox=\"0 0 512 512\" xml:space=\"preserve\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"currentColor\" d=\"M256 0C114.833 0 0 114.833 0 256s114.833 256 256 256 256-114.833 256-256S397.167 0 256 0Zm0 472.341c-119.275 0-216.341-97.066-216.341-216.341S136.725 39.659 256 39.659c119.295 0 216.341 97.066 216.341 216.341S375.275 472.341 256 472.341z\"></path>\n" +
              "        <circle cx=\"160\" cy=\"250\" r=\"60\" fill=\"currentColor\"></circle>\n" +
              "        <circle cx=\"320\" cy=\"150\" r=\"60\" fill=\"currentColor\"></circle>\n" +
              "        <circle cx=\"320\" cy=\"350\" r=\"60\" fill=\"currentColor\"></circle><path fill=\"currentColor\" d=\"M35 135h270v30H35zm175.782 100h270v30h-270zM35 335h270v30H35z\"></path></svg>"
        });
        Lampa.SettingsApi.addParam({
          component: 'synology_dlna_client_config',
          param: {
            name: 'synology_dlna_server',
            type: 'input', //доступно select,input,trigger,title,static
            placeholder: '',
            values: '',
            default: ''
          },
          field: {
            name: 'Адрес и порт DLNA сервера',
            description: 'Например, 192.168.1.5:50001'
          }
        });
        Lampa.SettingsApi.addParam({
          component: 'synology_dlna_client_config',
          param: {
            name: 'synology_dlna_proxy',
            type: 'input', //доступно select,input,trigger,title,static
            placeholder: '',
            values: '',
            default: ''
          },
          field: {
            name: 'Адрес и порт прокси',
            description: 'Например, 192.168.1.125:9118/proxy'
          }
        });        
        var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n            " +
            "    <svg viewBox=\"0 0 512 512\" xml:space=\"preserve\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"currentColor\" d=\"M256 0C114.833 0 0 114.833 0 256s114.833 256 256 256 256-114.833 256-256S397.167 0 256 0Zm0 472.341c-119.275 0-216.341-97.066-216.341-216.341S136.725 39.659 256 39.659c119.295 0 216.341 97.066 216.341 216.341S375.275 472.341 256 472.341z\"/>\n                    <circle cx=\"160\" cy=\"250\" r=\"60\" fill=\"currentColor\"/>\n                    <circle cx=\"320\" cy=\"150\" r=\"60\" fill=\"currentColor\"/>\n                    <circle cx=\"320\" cy=\"350\" r=\"60\" fill=\"currentColor\"/><path fill=\"currentColor\" d=\"M35 135h270v30H35zm175.782 100h270v30h-270zM35 335h270v30H35z\"/></svg>\n            </div>\n            <div class=\"menu__text\">".concat(manifest.name, "</div>\n        </li>"));
        button.on('hover:enter', function () {
          Lampa.Activity.push({
            url: '',
            title: manifest.name,
            component: manifest.component,
            page: 1
          });
        });
        $('.menu .menu__list').eq(0).append(button);
        $('body').append(Lampa.Template.get(manifest.component + '_style', {}, true));
      }
      Lampa.Component.add(manifest.component, Component);
      if (window.appready) add();else {
        Lampa.Listener.follow('app', function (e) {
          if (e.type == 'ready') add();
        });
      }
    }

    if (!window.plugin_synology_dlna_client) startPlugin();

})();
