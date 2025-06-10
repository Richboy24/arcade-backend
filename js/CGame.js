
function CGame(oData){
    var _bUpdate;
    var _iCurCredit = 0;
    var _iColToLaunchBall;

    this._init = function(){
        _iColToLaunchBall = 3;

        _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_game'));
        s_oStage.addChild(_oBg);

        _oBoard = new CBoard();
        _oBallGenerator = new CBallGenerator();
        _oInterface = new CInterface();
        _oInsertTubeController = new CInsertTubeController(_oBoard.getPos());

        _bUpdate = false;
    };

    this.setCredit = function(iAmount){
        _iCurCredit = iAmount;
        _oInterface.refreshCredit(_iCurCredit.toFixed(2));
    };

    this.setBall = function(){
        _oCurBall = _oBallGenerator.createBall();
        _oCurBall.setColumn(_iColToLaunchBall);
    };

    this.ballArrived = function(iDestCol){
        _oInsertTubeController.showSlots();
        _oBallGenerator.reset();
        _oInterface.showControls();
    };

    this.onChangeCol = function(iVal){
        _iColToLaunchBall = iVal;
    };

    this.onExit = function(){
        this.unload();
        s_oMain.gotoMenu();
    };

    this.unload = function(){
        s_oStage.removeAllChildren();
    };

    this._init();
    s_oGame = this;
}
