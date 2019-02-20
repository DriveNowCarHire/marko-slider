if (!window.initDone) {
    // debugger
    window.initDone = true
    require('demo/App.marko');
    require('marko/components').init();
}