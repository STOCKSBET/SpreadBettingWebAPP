var stocksBetContract;
var abi;
var account;
var instance;
var curContractMeta = null;
var curMoment;
var weiEth = 1000000000000000000;

window.addEventListener('load', function () {
    $.get("./abi.txt", function(abiTxt) {
      abi = JSON.parse(abiTxt);
      // Checking if Web3 has been injected by the browser (Mist/MetaMask)
      if (typeof web3 !== 'undefined') {
        //console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 TestTicker, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
        // Use Mist/MetaMask's provider
        if (web3.currentProvider != null) {
        window.web3 = new Web3(web3.currentProvider)
          // window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
          web3.version.getNetwork(function (err, netId) {
            if (netId != 3) {
              $('#containerBettingMainNet').show();
            } else {
              $('#containerBettingMainNet').hide();
              App.start();
              account = web3.eth.accounts[0];
            }
          });
        } else {
          App.warning();
        }
      } else {
        // console.warn("No web3 detected. Falling back to http://127.0.0.1:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask")
        App.warning();
        // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
        // window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
      }
    });
  })

window.App = {
    warning: function () {
      $('#containerBettingWarning').show();
    },

    start: function () {
      $('#containerBettingWarning').hide();
      if (localStorage.getItem("StocksBetContractMeta") != null) {
        curContractMeta = JSON.parse(localStorage.getItem("StocksBetContractMeta"));
      }
      var curContractMetaIsExist = false;

      //console.log(JSON.parse(localStorage.getItem("StocksBetContractMeta")));
      
      $.get("http://api.stocks.bet/v1/moment", function(resultMoment) {
        curMoment = resultMoment;
        $.get("http://api.stocks.bet/v1/contracts", function(contracts) {

          $.each(contracts, function(key, value) {
            if (curContractMeta != null) {
              if (curContractMeta.address == key) {
                curContractMetaIsExist = true;
              }
            }
            $('#selectBetting').prepend($("<option></option>")
              .attr("value",key)
              .text(value.split(' ')[0])); 
          });
  
        }).then(function(){
          if (!curContractMetaIsExist) {
            $('#selectBetting :first').attr("selected", "selected");
            curContractMeta = {
              address: $("#selectBetting :selected").val(),
              date: $("#selectBetting :selected").text()
            };
            localStorage.setItem('StocksBetContractMeta', JSON.stringify(curContractMeta));
            App.contractLoad(curContractMeta.address);
          }
          else {
            $("#selectBetting").val(curContractMeta.address).change();
          }
 
          //console.info("curContractMeta:", curContractMeta);
          //console.info("curContractMetaIsExist:", curContractMetaIsExist);
          //localStorage.setItem('myCat', 'Tom');
          //App.contractLoad(curContractMeta.address);
        });

      });

    },

    contractLoad: function (address) {
        //////////////////////////////////////////////////////////////////////////////
        $('#currentBettingName').html(curContractMeta.date + " Betting");

        stocksBetContract = web3.eth.contract(abi);
        instance = stocksBetContract.at(address);
        //console.info('instance:', instance)
    
        //console.info('owner', instance.owner())
        console.info('instance.address', instance.address)
        $('#contractAddress').html('<a href="https://ropsten.etherscan.io/address/' + instance.address + '" target="_blank">Smart Contract Address</a>');

        
        //new Date(timestamp)

        /*
        instance.owner((err, result) => {
            console.info("owner:", result);
          });
        */

        instance.actionStatus((err, result) => {

          $('#rewardUserInfo').html();
          $('#rewardUserTransactionResult').hide();
          $('#bettingWarning').hide();
          $('.buttonPlaceBet').hide();
          $('.divReward').hide();
          $('#bettingInfo').hide();
          $('#rewardUserResult').hide();
          $('#durationCurrentBetting').html('');
          //$('#rewardUserResultButtonCancel').hide();

          if (!account) {
            $('#rewardUserInfo').html("<b>Login to your account in <a href='https://metamask.io/' target='_blank'>MetaMask</a> to see detail of your betting.</b>");
          }
  

          if (result[3]) { // Voided
            $('#statusCurrentBetting').html("(Voided)");

          } else if (result[2]) { // End
            $('#statusCurrentBetting').html("(End)");
            $('.divReward').show();
            $('#rewardUserResult').show();
            $('#durationCurrentBetting').html('The Stocks rally is finished. Check your reward in this betting.');
            // $('#rewardUserInfo').append("The betting is completed");

            App.rewardCheck();

          } else if (result[1]) { // Start

            let durationText = '';
            var diff = Math.abs(new Date(curMoment) - new Date(result[10]));
            let duration = parseInt(result[4].toString()) / 60 - parseInt(diff / 1000 / 60);
            durationText = duration + ' minutes';

            $('#statusCurrentBetting').html("(Start)");
            
            $('#durationCurrentBetting').html("The Stocks rally is starting. You can see the result in " + durationText);
            if (duration <= 0) {
              $('#durationCurrentBetting').html("Change status of Betting in BlockChain.");
              console.info("Delay duration, min:", duration)
            }
            
            $('#bettingInfo').html('<b>Accepting bets is finished.</b> The Contract fix the price of stocks on ' + result[9].replace("00:00", "00 NY."));
            $('#bettingInfo').show();

          } else if (result[0]) { // Open

            let durationText = '';
            var diff = Math.abs(new Date(curMoment) - new Date(result[10]));
            //let duration = parseInt(result[4].toString()) / 60 - parseInt(diff / 1000 / 60);
            let duration = parseInt(result[5].toString()) - parseInt(diff / 1000 / 60);
            if (duration < 60) {
              durationText = duration + ' minutes';
            } else {
              durationText = parseInt((duration / 60)) + ' hours';
            }
            $('#statusCurrentBetting').html("(Open)");
            $('.buttonPlaceBet').show();

            $('#durationCurrentBetting').html("Bets will be close " + durationText + " before the stocks rally start.");

            if (duration <= 0) {
              $('#durationCurrentBetting').html("Change status of Betting in BlockChain.");
              console.info("Delay duration, min:", duration)
            }

          }
            
            
            
            
            /*
            console.info("actionStatus.isOpen:", result[0]);
            console.info("actionStatus.isStart:", result[1]);
            console.info("actionStatus.isEnd:", result[2]);
            console.info("actionStatus.isVoided:", result[3]);
            */

            
            //web3.utils.fromWei(reward,"ether")
            
            /*
            console.info("actionStatus.duration:", result[4].toString());
            console.info("actionStatus.durationLockBetReceiving:", result[5].toString());
            console.info("actionStatus.durationBettingResult:", result[6].toString());
            console.info("actionStatus.momentStart:", parseInt(result[7].toString()));
            console.info("actionStatus.momentCloseValue:", result[8]);
            console.info("actionStatus.momentOpen1MValue:", result[9]);
            console.info("actionStatus.momentSetup:", result[10]);
            */

            $('.momentCloseValue').html(result[8] + " 16:00 NY");
            $('.momentOpen1MValue').html(result[9].replace("00:00", "00 NY"));
        });

        /*
        instance.queryProp((err, result) => {
          console.info("err:", err);
           console.info("result:", result.toString() / weiEth);
        });
        */
        

        instance.getTotalPool((errTP, resultTP) => {
        //instance.totalPool((errTP, resultTP) => {
          let totalPool = parseInt(resultTP.toString());
           //console.info("totalPoolTP:", totalPool);
           //console.info("totalPool:", resultTP.toString());

          var stocksList = "MSFT,AAPL,GOOG".split(",");
          for (var i = 0, l = stocksList.length; i < l; i++) {
              let code = stocksList[i];
              instance.stocksIndex(code, (err, result) => {
                  //console.info(code + ".totalPool", result[0].toString());
                  //console.info(code + ".priceStart", result[1].toString());
                  //console.info(code + ".priceEnd", result[2].toString());
                  //console.info(code + ".betsCount", parseInt(result[3].toString()));
                  //console.info(code + ".isWinner", result[5]);
                  //console.info(code + ".canceledBetsCount", parseInt(result[4].toString()));
                  if (result[5] == true) {
                    $('#' + code + 'isWinner').html('<i class="fa fa-trophy icon-3x text-primary"></i>');
                  }
                  else {
                    $('#' + code + 'isWinner').html('');
                  }
                  
                  let odds = 0
                  var tp = parseInt(result[0].toString());
                  if (tp > 0) {
                    odds =  Math.round((totalPool / tp) * 100 - 100) / 100;
                  }
  
                  $('#' + code + 'Odds').html(odds);
                  $('.' + code + 'totalPool').html(parseInt(result[0].toString()) / weiEth);
                  $('#' + code + 'priceStart').html("$" + (result[1].toString() / 100));
                  $('#' + code + 'priceEnd').html("$" + (result[2].toString() / 100));
                  $('#' + code + 'betsCount').html(parseInt(result[3].toString()) - parseInt(result[4].toString()));

                  $('#containerBetting').show();
                  $('#footer').show();
              });
          }


        });

        /*
        instance.totalReward((err, result) => {
            console.info("totalReward:", parseInt(result.toString()));
        });
        */


        /*
        instance.getRewardTotal((err, result) => {
            console.info("rewardTotal:", result.toString());
            $('#rewardUserResult').append("Total reward: " + result.toString() + " ETH");
        });
        */
        
        instance.getBettorInfo((err, result) => {

          if (!!account) {
            $('#rewardUserInfo').html("<b>Your bets count: " + result[0].toString() + "</b>");

            for (var i = 0; i < result[1].length; i++) {

              let bettorStockName;
              if (result[1][i] == "0x4d53465400000000000000000000000000000000000000000000000000000000") {
                bettorStockName = "MSFT";
              } else if (result[1][i] == "0x474f4f4700000000000000000000000000000000000000000000000000000000") {
                bettorStockName = "GOOG";
              } else if (result[1][i] == "0x4141504c00000000000000000000000000000000000000000000000000000000") {
                bettorStockName = "AAPL";
              }

              let bettorAmounts = result[2][i] / weiEth;

              if (i == 0) $('#rewardUserInfo').append("<br>"); 
              else  $('#rewardUserInfo').append(", "); 
              $('#rewardUserInfo').append("" + bettorStockName + ": " + bettorAmounts + " ETH");
              if (result[3][i]) {
                $('#rewardUserInfo').append(" Cancelled");
              }
              
              //console.info("bettorInfo.bettorStocks:", result[1][i]);
              //console.info("bettorInfo.bettorAmounts:", result[2][i]);
              //console.info("bettorInfo.isCancelled:", result[3][i]);
            }
          }
        });

        /*
        instance.stocks((err, result) => {
            console.info("oddsAAPL:", result[0].toString());
            console.info("oddsMSFT:", result[1].toString());
            console.info("oddsGOOG:", result[2].toString());
        });
        */
        //////////////////////////////////////////////////////////////////////////////
    },

    selectBetting: function (inst) {
      curContractMeta = {
        address: $("#selectBetting :selected").val(),
        date: $("#selectBetting :selected").text()
      };
      localStorage.setItem('StocksBetContractMeta', JSON.stringify(curContractMeta));

      App.contractLoad(curContractMeta.address);
    },

    cancelAllBets: function (code) {
      /*
      instance.cancelAllBet("GOOG", {gas: 1000000}, function(err, result) { 
        console.log("cancelAllBetGOOG");
        console.info("err:", err);
        console.info("result:", result);
      });
      */
    },

    rewardClaim: function () {
      instance.rewardClaim((err, result) => {
          //console.log(result);
          //console.log(err);
          $('#rewardUserTransactionResult').html('<a href="https://ropsten.etherscan.io/tx/' + result + '" target="_blank"><b>Transaction Address in BlockChain</b></a><br>Please, wait about 2 minutes, and you will see ETH in your wallet.');
          $('#rewardUserTransactionResult').show();
      });
    },

    rewardCheck: function () {

      if (!!account) {
        $('#rewardUserTransactionResult').html('...');
        instance.rewardCheck((err, result) => {
          //console.log(result);
          if (parseInt(result.toString()) == 0) {
            $('#rewardUserResult').html('');
            $('#rewardUserResultButtonCheck').show();

            $('#rewardUserTransactionResult').html('Here is no reward or may be you took out the money early.');
            $('#rewardUserTransactionResult').show();

          } else {
            $('#rewardUserTransactionResult').hide();
            $('#rewardUserResultButtonCheck').hide();
            //console.log(parseInt(result.toString());
            //console.log(err);

            $('#rewardUserResult').html("Your reward in this betting: " + (result.toString() / weiEth) + " ETH");
            if (result.toString() != "0") {
              $('#rewardUserResultButtonClaim').show();
            }
          }
        });
      }
    },


    setPlaceBetModal: function (code) {
      var stName = "Microsoft";
      if (code == "GOOG") { 
        stName = "Google";
      } else if (code == "AAPL") {
        stName = "Apple";
      }
      $("#placeBetModalTitle").html(stName + ", " + code);
      $("#placeBetModalCode").val(code);
    },

    sendBet: function (val) {
        instance.sendBet($("#placeBetModalCode").val(), {value: val * weiEth}, function(err, result) { 
            $("#placeBetModalTransactionResult").html('<a href="https://ropsten.etherscan.io/tx/' + result + '" target="_blank">Transaction Address in BlockChain</a><br>Please, wait about 2 minutes, and refrash the page to see you bet.');
        });
    },

    hideTradingView: function () {
      $("#containerTradingView").hide();
      $("#aHideContainerTradingView").hide();
      $("#aShowContainerTradingView").show();
    },
    showTradingView: function () {
      $("#containerTradingView").show();
      $("#aHideContainerTradingView").show();
      $("#aShowContainerTradingView").hide();
    }

  }
  

  