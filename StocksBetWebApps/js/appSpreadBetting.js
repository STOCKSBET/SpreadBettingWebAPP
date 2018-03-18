var lastUpdated;
var lastUpdatedPrev;
var askPricePrev;
var bidPricePrev;
var instrumentCode = "";
//var spreadBetting = null;
var isActiveBetting = false;
var activeBettingType;

var trades = [];
var tradesCount = 0;
var lastAskPrice = 0;
var lastBidPrice = 0;
var isMarketOpen = false;

var bettorDetail = {
  totalCount: 1000,
  bets: [ ]
};

var lastPriceData = {
  close: 0,
  value: 0,
  change: 0,
  changePercent: 0,
  sourceStatus: ""
};

window.addEventListener('load', function () {

    instrumentCode = $("#instrumentCode").val();

  $.get("https://api.iextrading.com/1.0/deep/system-event", function (sysEvent) {

    App.setMarketStatus(sysEvent.systemEvent);

    $.get("https://api.iextrading.com/1.0/stock/" + instrumentCode + "/quote", function (quote) {

      lastPriceData.value = quote.latestPrice;
      lastPriceData.close =  quote.close;
      lastPriceData.change = (lastPriceData.value - lastPriceData.close).toPrecision(3);
      lastPriceData.changePercent = (lastPriceData.change / lastPriceData.value * 100).toPrecision(2);
      lastPriceData.sourceStatus = quote.latestSource + " at " + quote.latestTime;
      
        App.setQuoteStatus();
        App.setChartData();
        //App.setPeers();

        //App.setYourSpreadBettingRevenue();
        App.setBettorInfo();

        if (!isMarketOpen) {
        App.updateInstrumentDataDefault();
        } else {
          var socket = io('https://ws-api.iextrading.com/1.0/deep');
          socket.on('connect', () => {
            socket.emit('subscribe', JSON.stringify({
              symbols: [instrumentCode],
              channels: ['trades', 'book' /*, 'system-event'*/],
            }))
          });
          socket.on('message', message => App.updateInstrumentData(JSON.parse(message)));
        };

      });
  });
});

window.App = {

  updateInstrumentDataDefault: function (message) {
    $('#tradesList').html('<tr><td colspan="4">No trades</td></tr>');
    $('#asksOrders').html('<tr><td colspan="3">No asks</td></tr>');
    $('#bidsOrders').html('<tr><td class="text-lg-right" colspan="3">No bids</td></tr>');
  },

  updateInstrumentData: function (message) {

    console.log(message);

    if (message.messageType == "trades") {
      if (tradesCount == 0) {
        $('#tradesList').html('');
      }
      var value = message.data;

      //console.log(value.price);

      lastPriceData.value = value.price;
      lastPriceData.change = (lastPriceData.value - lastPriceData.close).toPrecision(3);
      lastPriceData.changePercent = (lastPriceData.change / lastPriceData.value * 100).toPrecision(2);
      lastPriceData.sourceStatus = "Last trade at " + new Date(value.timestamp);
      App.setQuoteStatus();


      console.info("isActiveBetting:", isActiveBetting);

      var tradeStatus = '';
      if (value.price >= lastAskPrice) {
        tradeStatus = '<span style="color: #212529;">Long Bets Win!</span>';
        if (isActiveBetting) {
          if (activeBettingType == "long") {
            App.addCash();
            var bet = bettorDetail.bets[0];
            bettorDetail.bets[0].status = 'Win!';
            tradeStatus = '<b style="color: rgb(22, 136, 84);">Your ' + activeBettingType + ' Bet is Won!!!</b>';
          } else {
            bettorDetail.bets[0].status = 'Lost!';
            tradeStatus = '<b style="color: rgb(220, 55, 45);">Your ' + activeBettingType + ' Bet is Lost!!!</b>';
          }
          isActiveBetting = false;
        }
        $('#tradesList').prepend('<tr style="color: rgb(22, 136, 84);"><td><b>' + value.price + '</b></td><td>x</td><td>' + value.size + '</td><td>' + tradeStatus + '</td></tr>');
      } else if (value.price <= lastBidPrice) {
        tradeStatus = '<span style="color: #212529;">Short Bets Win!</span>';
        if (isActiveBetting) {
          if (activeBettingType == "short") {
            App.addCash();
            bettorDetail.bets[0].status = 'Win!';
            tradeStatus = '<b style="color: rgb(22, 136, 84);">Your ' + activeBettingType + ' Bet is Won!!!</b>';
          } else {
            bettorDetail.bets[0].status = 'Lost!';
            tradeStatus = '<b style="color: rgb(220, 55, 45);">Your ' + activeBettingType + ' Bet is Lost!!!</b>';
          }
          isActiveBetting = false;
        }
        $('#tradesList').prepend('<tr style="color: rgb(220, 55, 45);"><td><b>' + value.price + '</b></td><td>x</td><td>' + value.size + '</td><td>' + tradeStatus + '</td></tr>');
      } else {
        $('#tradesList').prepend('<tr><td><b>' + value.price + '</b></td><td>x</td><td>' + value.size + '</td><td></td></tr>');
      }


      if (tradesCount >= 5) {
        $('#tradesList tr').last().remove();
      }
      tradesCount++;

      /*
          if (value.price >= lastAskPrice) {
            //console.info("isActiveBetting:", isActiveBetting);
            //console.info("activeBettingType:", activeBettingType);
      
            //if (value.price > )
            console.log("Long Bets Win !!!");
          }
      
          if (value.price <= lastBidPrice) {
            console.log("Short Bets Win !!!");
          }
          */


    } else if (message.messageType == "pricelevelbuy") {

      $('#bidsOrders').html('');
      i = 0;
      $.each(message.data, function (index, value) {
        if (i == 0) {
          lastBidPrice = value.price;
          $('#bidPrice').html(lastBidPrice);
          $('#bidsOrders').append('<tr class="text-lg-right" style="color: rgb(220, 55, 45);"><td>' + value.size + '</td><td>x</td><td><b>' + value.price + '</b></td></tr>');
        } else {
          $('#bidsOrders').append('<tr class="text-lg-right"><td>' + value.size + '</td><td>x</td><td><b>' + value.price + '</b></td></tr>');
        }
        i++;
      });

      //App.setBettorInfo();

    } else if (message.messageType == "pricelevelsell") {

      $('#asksOrders').html('');
      i = 0;
      $.each(message.data, function (index, value) {
        if (i == 0) {
          lastAskPrice = value.price;
          $('#askPrice').html(lastAskPrice);
          $('#asksOrders').append('<tr style="color: rgb(22, 136, 84);"><td><b>' + value.price + '</b></td><td>x</td><td>' + value.size + '</td></tr>');
        } else {
          $('#asksOrders').append('<tr><td><b>' + value.price + '</b></td><td>x</td><td>' + value.size + '</td></tr>');
        }
        i++;
      });

      //App.setBettorInfo();
    }


    App.setBettorInfo();

    /*
      //lastUpdated = data.lastUpdated;
      if (lastUpdatedPrev != lastUpdated) {
        if (data.askPrice != 0) {
          $("#spreadBetBtns").show();
          $("#spreadBetText").hide();
          $("#askPrice").html(data.askPrice);
          $("#bidPrice").html(data.bidPrice);
  
          if (askPricePrev != data.askPrice) {
            console.log("askUpdate");
            App.updateBook();
            if (data.lastSalePrice >= askPricePrev) {
              if (isActiveBetting) {
               if (activeBettingType == "long") {
                console.log("Your Win !!!");
               } else {
                console.log("Your Loose !!!");
               }
              }
              console.log("Long Bets Win !!!");
              isActiveBetting = false;
            }
            askPricePrev = data.askPrice;
          }
  
          if (bidPricePrev != data.bidPrice) {
            console.log("bidUpdate");
            App.updateBook();
            if (data.lastSalePrice <= bidPricePrev) {
              if (isActiveBetting) {
                if (activeBettingType == "short") {
                 console.log("Your Win !!!");
                } else {
                 console.log("Your Loose !!!");
                }
               }
              console.log("Short Bets Win !!!");
              isActiveBetting = false;
            }
            bidPricePrev = data.bidPrice;
          }
  
          if (data.lastSalePrice == data.askPrice) {
            console.log("Кнопка Long Bet не активна lastSalePrice = askPrice");
          }
          if (data.lastSalePrice == data.bidPrice) {
            console.log("Кнопка Short Bet не активна lastSalePrice =bidPrice");
          }
          
        } else {
          $("#spreadBetBtns").hide();
          $("#spreadBetText").show();
        }
  
        $("#lastSalePrice").html(data.lastSalePrice);
        console.log(data);
      }
      lastUpdatedPrev = lastUpdated;
      */
  },

  setChartData: function () {
    $.get("https://api.iextrading.com/1.0/stock/" + instrumentCode + "/chart/1d", function (data) {

      var arr = [];
      
      $.each(data, function (index, value) {
        //console.log(value.marketAverage);
        if (value.average > 0) {
        arr.push([value.label,
        value.average
        ]);
      }
      });
      
      //console.log(arr);


      Highcharts.chart('HighchartsContainer', {
        chart: {
          zoomType: 'x'
        },
        title: {
          text: '',
          enabled: false
        },
        subtitle: {
          text: document.ontouchstart === undefined ?
            '*Click and drag in the plot area to Zoom in.' : '*Pinch the chart to Zoom in.',
            align: 'left',
            
        },
        xAxis: {
          //type: 'time',
          enabled: false,
          labels:
            {
              enabled: false
            }
        },
        yAxis: {
          title: {
            enabled: false,
          },
          opposite: true
        },
        legend: {
          enabled: false
        },
        plotOptions: {
          area: {
            fillColor: {
              linearGradient: {
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 1
              },
              stops: [
                //[0, Highcharts.getOptions().colors[7]],
                [1, Highcharts.Color('#00ADBB').setOpacity(0).get('rgba')]
              ]
            },
            marker: {
              radius: 5
            },
            lineWidth: 2,
            states: {
              hover: {
                lineWidth: 2
              }
            },
            threshold: null
          },
          series: {
            color: '#00ADBB'
          }
        },

        series: [{
          type: 'area',
          name: instrumentCode.toUpperCase(),
          data: arr
        }]
      });








      //let i;
      /*
        $("#symbol").html(data.symbol);
          $("#companyName").html(data.companyName);
          $("#exchange").html(data.exchange);
          $("#industry").html(data.industry);
          $("#description").html(data.description);
          $("#CEO").html(data.CEO);
          $("#sector").html(data.sector);
          */
      //$("#logo").attr("src", "https://storage.googleapis.com/iex/api/logos/" + data.symbol + ".png");


      //$('#tradesList').html('');


      //console.log(data);
      //value.price: 179.13, size:
    });
  },

  /*
  setPeers: function () {
    $.get("https://api.iextrading.com/1.0/stock/" + instrumentCode + "/peers", function (data) {
      $("#instrumentPeers").html("<p>You may like this stocks:</p>");
      var i = 0;
      $.each(data, function (index, value) {
        if (i > 0) {
          $("#instrumentPeers").append(', ');
        }
        $("#instrumentPeers").append('<a href="#">' + value + '</a>');
        i++;
      });
    });

    //https://api.iextrading.com/1.0/tops/last
    //$.get("https://api.iextrading.com/1.0/stock/AAPL/realtime-update?last=3&chart=true&changeFromClose=true&peers=MSFT,NOK,IBM,HPQ,GOOGL,BB,XLK", function (data) {
    $.get("https://api.iextrading.com/1.0/stock/" + instrumentCode + "/quote", function (data) {
      //console.log(data);
    });
  },
  */

  setMarketStatus: function (systemEvent) {
    var marketStatusText = "Market is closed.";
    isMarketOpen = false;
    if (systemEvent == "S") {
      marketStatusText = "Pre-market.";
      isMarketOpen = true;
    } else if (systemEvent == "R") {
      marketStatusText = "Market is open.";
      isMarketOpen = true;
    } else if (systemEvent == "M") {
      marketStatusText = "After hours.";
      isMarketOpen = true;
    }
    $("#marketStatus").html(marketStatusText);
  },


  setQuoteStatus: function () {

    $("#latestSourceStatus").html(lastPriceData.sourceStatus);
    $("#latestPrice").html(lastPriceData.value);
    if (lastPriceData.change == 0) {
      $("#latestPriceChange").html("");
      $("#latestPriceChangePercent").html("");
    } else if (lastPriceData.change > 0) {
      $("#latestPriceChange").attr("style", "font-size: 0.5em; color: rgb(22, 136, 84);");
      $("#latestPriceChangePercent").attr("style", "font-size: 0.5em; color: rgb(22, 136, 84);");

      $("#latestPriceChange").html("+" + lastPriceData.change);
      $("#latestPriceChangePercent").html("(+" + lastPriceData.changePercent  + "%)");
    } else if (lastPriceData.change < 0) {
      $("#latestPriceChange").attr("style", "font-size: 0.5em; color: rgb(220, 55, 45);");
      $("#latestPriceChangePercent").attr("style", "font-size: 0.5em; color: rgb(220, 55, 45);");

      $("#latestPriceChange").html(lastPriceData.change);
      $("#latestPriceChangePercent").html("(" + lastPriceData.changePercent + "%)");
    } 

  },

  //
  ////////////////////////////////

  addCash: function () {
    console.log("addCash");
    bettorDetail.totalCount += 200;
    //App.setYourSpreadBettingRevenue();
  },

  addSpreadBet: function (type) {

    if (!isActiveBetting) {

      //console.log(isActiveBetting);
      bettorDetail.totalCount -= 100;
      bettorDetail.bets.unshift({
        type: type,
        stbtNum: 100,
        status: '',
        moment: (new Date()).toString()
      });

      //console.log(bettorDetail.bets[0]);
      //var bet = bettorDetail.bets[0];
      //bet.status = 'Win!'; //Loss
      //bettorDetail.bets[0] = bet;
      //win. loss

      if (isActiveBetting) {
        //$("#bettingResults").html("говорим что ставка уже поставлена");
        //console.log();
      } else {
        //isActiveBetting = true;
        activeBettingType = type;
        
        //      console.log("setSpreadBet: " + type);
        if (type == "long") {

        } else {

        }
      }
    }

    isActiveBetting = true;
    
    App.setBettorInfo();
  },

  setBettorInfo: function () {

    $("#yourSpreadBettingRevenue").html("Total " + bettorDetail.totalCount + " STBT");
    $("#spreadBetBtns").hide();
    $("#spreadBetText").hide();
    
    if (isMarketOpen) {
      if (isActiveBetting) {
        $("#btnAddSpreadBetShort").attr("disabled", "disabled");
        $("#btnAddSpreadBetShort").attr("style", "background-color: #ff8a96;");
        $("#btnAddSpreadBetLong").attr("disabled", "disabled");
        $("#btnAddSpreadBetLong").attr("style", "background-color: #2ebf8f;");
        $("#spreadBetText").show();
        $("#spreadBetText").html("<b>Wait some deal (trade) on the market <br>by the price of best bid/ask!</b>");
      } else {
        if (lastAskPrice == 0 || lastBidPrice == 0) {
          $("#btnAddSpreadBetShort").attr("disabled", "disabled");
          $("#btnAddSpreadBetShort").attr("style", "background-color: #ff8a96;");
          $("#btnAddSpreadBetLong").attr("disabled", "disabled");
          $("#btnAddSpreadBetLong").attr("style", "background-color: #2ebf8f;");
          $("#spreadBetText").show();
          $("#spreadBetText").html("<b>Please wait we are preparing the data for you!</b>");
        } else {
          $("#btnAddSpreadBetShort").removeAttr("disabled");
          $("#btnAddSpreadBetShort").removeAttr("style");
          $("#btnAddSpreadBetLong").removeAttr("disabled");
          $("#btnAddSpreadBetLong").removeAttr("style");
        }
      }
      //$("#spreadBetText").hide();
      $("#spreadBetBtns").show();
    }
    else {
      $("#btnAddSpreadBetShort").attr("disabled", "disabled");
      $("#btnAddSpreadBetShort").attr("style", "background-color: #ff8a96;");
      $("#btnAddSpreadBetLong").attr("disabled", "disabled");
      $("#btnAddSpreadBetLong").attr("style", "background-color: #2ebf8f;");
      $("#spreadBetText").show();
      $("#spreadBetBtns").show();
    }
  
//    <p>Market is closed, you can bet on this stocks only when market is Open.</p>



    $("#bettingResults").html('');
    var i = 0;
    $.each(bettorDetail.bets, function (index, value) {
      if (i == 0) {
        $("#bettingResults").append("<b>Last: " + value.type + " bet, " + value.stbtNum + " STBT, " + value.status + " at " + value.moment + "</b>");
        if (bettorDetail.bets.length > 1) {
          $("#bettingResults").append("<br>Previous: ");
        }
      } else {
        if (i != 1) {
          $("#bettingResults").append("; ");
        }
        $("#bettingResults").append(value.type + " bet, " + value.stbtNum + " STBT, " + value.status);
      }
      i++;
    });
    
    if (bettorDetail.bets.length == 0) {
      $("#bettingResults").html('There is no bets. Add some when market is open, via buttons: "Going Short" or "Going Long".');
    }


    /*
    if (lastBidPrice > 0 && lastAskPrice > 0) {
      $("#askPrice").html(lastAskPrice);
      $("#bidPrice").html(lastBidPrice);

      $("#spreadBetBtns").show();
      $("#spreadBetText").hide();
    } else {
      $("#spreadBetBtns").hide();
      $("#spreadBetText").show();
    }
    */

  }


}