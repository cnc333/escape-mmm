$(function () {
    var countUps, siteUrl, web3MetaMask;
    var player = {
        affiliateAddress: '', 
        myAddress: '',
        totalOffered: 0,
        totalAccepted: 0,
        airDroped: 0,
        balance: 0,
        canAccept: 0,
        affiliateEarned: 0,
        siteEarned: 0,
        totalAssets: 0,
        nextTotalAssets: 0,
        earliestInterestTime: 0
    }, app = {
        airdrop: 0,
        airdropRate: 0,
        interestPeriod: 0, 
        maxInterestTime: 0 
    }
    var ls = location.href.split('/?');
    if (ls[0].lastIndexOf('/') == ls[0].length - 1) { // no #
        siteUrl = ls[0].substring(0, ls[0].length);
    } else if (ls[0].indexOf('#') > 0) {
        siteUrl = ls[0].substring(0, ls[0].indexOf('#'));
    }
    $('#site-url').html(siteUrl);
    if (typeof web3 == 'undefined') {
        $('#no-metamask-modal').modal('show');
    } else {
        web3MetaMask = new Web3(web3.currentProvider);
    }
	var mmm = web3MetaMask.eth.contract(contractABI).at(contractAddress);
	
	web3MetaMask.version.getNetwork(function (err, netId) {
		if (netId != '1') {
			$('#not-mainnet-modal').modal('show');
		}
	});

    if (ls.length > 1 && web3MetaMask.isAddress(ls[1])) {
        player.affiliateAddress = ls[1];
    }

    mmm.interestPeriod_(function(error, data) {
        app.interestPeriod = data.toString(10);
        $('.i-period').html(timeToText(app.interestPeriod));
    })
    mmm.maxInterestTime_(function(error, data) {
        app.maxInterestTime = data.toString(10);
    })

    updateMyAddress();
    getAirDrop();

    watchEvents();
    new ClipboardJS('#referer-link', {
        text: function(trigger) {
            return siteUrl + '?' + player.myAddress;
        }
    }).on('success', function(e) {
        $('#referer-link').tooltip('hide');
        $.toast("Your Referer Link Copyed!")
    });
    $('[data-toggle="tooltip"]').tooltip();
    $('#btn-provide').on('click', function() {
        var amount = $('#provide-amount').val();
        if (isNaN(amount) || amount <= 0) {
            alert('provide amount must be bigger than 0 ETH !');
            return;
        }
        mmm.offerHelp(config.siteOwner, player.affiliateAddress, {value: web3MetaMask.toWei(amount.toString(), 'ether')}, function(error, data) {
            $.toast({
                text: 'ransaction send success! txHash: ' + data,
                position: 'bottom-right',
                icon: 'info'
            });
        })
    });

    $('#btn-provide-balance').on('click', function() {
        var amount = $('#provide-amount').val();
        if (isNaN(amount) || amount <= 0) {
            alert('provide amount must be bigger than 0 ETH !');
            return;
        }
        mmm.offerHelpUsingBalance(config.siteOwner, player.affiliateAddress, web3MetaMask.toWei(amount.toString(), 'ether'), function(error, data) {
            $.toast({
                text: 'ransaction send success! txHash: ' + data,
                position: 'bottom-right',
                icon: 'info'
            });
        })
    });

    $('#btn-accpet').on('click', function() {
        var amount = $('#accept-amount').val();
        if (isNaN(amount) || amount <= 0) {
            alert('apply amount must be a number > 0!');
            return;
        }
        if (amount > player.canAccept) {
            alert('apply amount must be less than ' + player.canAccept + '!');
            return;
        }
        mmm.acceptHelp(web3MetaMask.toWei(amount.toString(), 'ether'), function (error, data) {
            $.toast({
                text: 'transaction send success! txHash: ' + data,
                position: 'bottom-right',
                icon: 'info'
            });
        })
    });

    $('#player-balance').on('click', function () {
        if (Number(player.balance) < 0.001) {
            alert('at least 0.001 ETH of balance to withdraw!');
            return;
        }
        if (confirm('are you sure to withdraw all your balance(' + player.balance + ') ?')) {
            mmm.withdraw(function(error, data) {
                $.toast('withdraw transaction send success! txHash: ' + data);
            });
        }
	});
	
	setInterval(function() {
		if (web3MetaMask.eth.accounts[0] !== player.myAddress) {
			updateMyAddress();
		}
	}, 1000);

    function watchEvents() {
        mmm.onOffered().watch(function (error, data) {
            if (!error) {
                if (data.args.playerAddress == player.myAddress) {
                    // this.$awn.success('You successfully provide ' + Number(web3.utils.fromWei(data.returnValues.offerAmount, 'ether')))
                    $.toast({
                        text: 'You successfully provide for ' + Number(web3MetaMask.fromWei(data.args.offerAmount, 'ether')),
                        position: 'bottom-right',
                        icon: 'success'
                    });
                    getMyAssets();
                } else {
                    // this.$awn.success('Somebody provided ' + Number(web3.utils.fromWei(data.returnValues.offerAmount, 'ether')))
                    $.toast({
                        text: 'Somebody provided ' + Number(web3MetaMask.fromWei(data.args.offerAmount, 'ether')),
                        position: 'bottom-right',
                        icon: 'info'
                    });
                }
                if (web3MetaMask.fromWei(data.args.offerAmount, 'ether') - 0.001 >= 0) {
                    getAirDrop();
                }
            }
        });
        mmm.onAccepted().watch(function (error, data) {
            if (!error) {
                if (data.args.playerAddress == player.myAddress) {
                    $.toast({
                        text: 'You successfully apply for ' + Number(web3MetaMask.fromWei(data.args.acceptAmount, 'ether')),
                        position: 'bottom-right',
                        icon: 'success'
                    });
                    getMyAssets();
                } else {
                    $.toast({
                        text: 'Somebody apply for ' + Number(web3MetaMask.fromWei(data.args.acceptAmount, 'ether')),
                        position: 'bottom-right',
                        icon: 'info'
                    });
                }
            }
        });
        mmm.onWithdraw().watch(function (error, data) {
            if (!error) {
                if (data.args.playerAddress == player.myAddress) {
                    $.toast({
                        text: 'you escaped ' + Number(web3MetaMask.fromWei(data.args.withdrawAmount, 'ether')),
                        position: 'bottom-right',
                        icon: 'success'
                    });
                    getMyAssets();
                } else {
                    $.toast({
                        text: 'Somebody is escaped ' + Number(web3MetaMask.fromWei(data.args.withdrawAmount, 'ether')),
                        position: 'bottom-right',
                        icon: 'info'
                    });
                }
            }
        });
        mmm.onAirDrop().watch(function (error, data) {
            if (!error) {
                if (data.args.playerAddress == player.myAddress) {
                    $.toast({
                        text: 'YOU WON THE AIRDROP: ' + Number(web3MetaMask.fromWei(data.args.airdropAmount, 'ether')),
                        position: 'middle-center',
                        icon: 'error'
                    });
                    getMyAssets();
                } else {
                    // this.$awn.alert('SOMEONE WON THE AIRDROP ' + Number(web3.utils.fromWei(data.returnValues.airdropAmount, 'ether')))
                    $.toast({
                        text: 'SOMEONE WON THE AIRDROP: ' + Number(web3MetaMask.fromWei(data.args.airdropAmount, 'ether') + ' with providing ' + Number(web3MetaMask.fromWei(data.returnValues.offerAmount, 'ether'))),
                        position: 'middle-center',
                        icon: 'error'
                    });
                }
                getAirDrop();
            }
        })
    }
    function getAirDrop() {
        mmm.airDropPool_(function(error, data) {
            app.airdrop = Number(web3MetaMask.fromWei(data, 'ether')).toFixed(5);
            $('#airdrop-pool').html(app.airdrop);
        });
        mmm.airDropTracker_(function(error, data) {
            app.airdropRate = (data / 100).toFixed(2);
            $('#airdrop-rate').html(app.airdropRate);
        });
    }
    function getMyAssets() {
        mmm.getPlayerInfo(player.myAddress, function(error, myAssets) {
            player.totalOffered = Number(web3MetaMask.fromWei(myAssets[5], 'ether'));
            player.totalAccepted = Number(web3MetaMask.fromWei(myAssets[6], 'ether'));
            player.airDroped = Number(web3MetaMask.fromWei(myAssets[4], 'ether'));
            player.balance = Number(web3MetaMask.fromWei(myAssets[2], 'ether'));
            player.canAccept = Number(web3MetaMask.fromWei(myAssets[3], 'ether'));
            player.affiliateEarned = Number(web3MetaMask.fromWei(myAssets[7], 'ether'));
            player.siteEarned = Number(web3MetaMask.fromWei(myAssets[8], 'ether'));
            player.totalAssets = Number(web3MetaMask.fromWei(myAssets[0], 'ether'));
            player.nextTotalAssets = Number(web3MetaMask.fromWei(myAssets[1], 'ether'));
            player.earliestInterestTime = myAssets[9].toString(10);
            $('#balance').html(fillZero(player.balance));
            $('#applicable').html(fillZero(player.canAccept));
            $('#provided').html(fillZero(player.totalOffered));
            $('#applied').html(fillZero(player.totalAccepted));
            $('#airdroped').html(fillZero(player.airDroped));
            $('#affied').html(fillZero(player.affiliateEarned));
            $('#siteEarned').html(fillZero(player.siteEarned));
            if (player.siteEarned > 0) {
                $('#siteEarned').parents('.site').removeClass('d-none');
            }
            var duration = player.earliestInterestTime == 0 ? app.interestPeriod : ((player.earliestInterestTime * 1000 - Date.now()) / 1000)
            updateCountUpAsset(player.totalAssets, player.nextTotalAssets, duration);
        })
    }
    function countUpAsset(start, end, duration) {
        countUps = $('.count-assets').countup({
            startVal: start,
            decimals: 18,
            duration: duration,
            endVal: end,
            ready: function () {
                getMyAssets();
            }
        });
    }
    function updateCountUpAsset(start, end, duration) {
        if (countUps) {
            countUps.update(start, end, duration);
        } else {
            countUpAsset(start, end, duration)
        }
    }
    function updateMyAddress() {
        player.myAddress = web3MetaMask.eth.accounts[0];
		$('#referer-link').html(siteUrl + '?' + player.myAddress);
		getMyAssets();		
    }
});
function fillZero(num, size = 18) {
    num = String(num)
    let ns = num.split('.')
    let l = 0
    if (ns.length == 1) {
      l = size
      num = num + '.'
    } else {
      l = size - ns[1].length
    }
    for (let i = 0; i < l; i++) {
      num += '0'
    }
    return num
  }
function timeToText(time) {
    let seconds = time
    let hours = parseInt(seconds / 3600)
    seconds = seconds - hours * 3600
    let rest = ''
    if (hours > 0) {
        rest = hours + ' Hours'
    }
    let minutes = parseInt(seconds / 60)
    seconds = seconds - minutes * 60
    if (minutes > 0) {
        rest += minutes + ' Minutes'
    }
    if (seconds > 0) {
        rest += minutes + ' Seconds'
    }
    return rest
}

(function ($) {

    $.fn.countup = function (params) {
        // make sure dependency is present
        if (typeof CountUp !== 'function') {
            console.error('countUp.js is a required dependency of countUp-jquery.js.');
            return;
        }

        var defaults = {
            startVal: 0,
            decimals: 0,
            duration: 2,
        };

        if (typeof params === 'number') {
            defaults.endVal = params;
        }
        else if (typeof params === 'object') {
            $.extend(defaults, params);
        }
        else {
            console.error('countUp-jquery requires its argument to be either an object or number');
            return;
        }

        

        this.each(function (i, elem) {
            var countUp = new CountUp(elem, defaults.startVal, defaults.endVal, defaults.decimals, defaults.duration, defaults.options);
            elem.countUp = countUp;
            if (typeof params.ready === 'function') {
                countUp.start(params.ready(elem));
            } else {
                countUp.start();
            }
        });

        this.update = function (start, end, duration) {
            this.each(function (i, elem) {
                var countUp;
                if (elem.countUp) {
                    countUp = elem.countUp;
                } else {
                    countUp = new CountUp(elem, defaults.startVal, defaults.endVal, defaults.decimals, defaults.duration, defaults.options);
                    elem.countUp = countUp;
                }
                if (start) {
                    countUp.frameVal = start;
                }
                if (end) {
                    countUp.endVal = end;
                }
                if (duration) {
                    countUp.duration = duration * 1000;
                }
                countUp.update(end);
            })
        }

        return this;
    };

}(jQuery));

var contractAddress = '0x4d31f5a4ea035872d11efb4ff2d6ed9bb3a58e81';
var contractABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"name": "playerAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"name": "airdropAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"name": "offerAmount",
				"type": "uint256"
			}
		],
		"name": "onAirDrop",
		"type": "event"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "acceptHelp",
		"outputs": [
			{
				"name": "canAcceptLeft",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "siteOwner",
				"type": "address"
			},
			{
				"name": "affiliate",
				"type": "address"
			}
		],
		"name": "offerHelp",
		"outputs": [],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "siteOwner",
				"type": "address"
			},
			{
				"name": "affiliate",
				"type": "address"
			},
			{
				"name": "ethAmount",
				"type": "uint256"
			}
		],
		"name": "offerHelpUsingBalance",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"name": "playerAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"name": "acceptAmount",
				"type": "uint256"
			}
		],
		"name": "onAccepted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"name": "previousOwner",
				"type": "address"
			}
		],
		"name": "OwnershipRenounced",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"name": "playerAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"name": "withdrawAmount",
				"type": "uint256"
			}
		],
		"name": "onWithdraw",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"name": "playerAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"name": "offerAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"name": "affiliateAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"name": "siteOwner",
				"type": "address"
			},
			{
				"indexed": false,
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "onOffered",
		"type": "event"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "wallet",
				"type": "address"
			}
		],
		"name": "setTeamWallet",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "transFee",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"payable": true,
		"stateMutability": "payable",
		"type": "fallback"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "withdraw",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "_totalFee",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "_totalXT",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "acceptOrders_",
		"outputs": [
			{
				"name": "orderId",
				"type": "uint256"
			},
			{
				"name": "playerAddress",
				"type": "address"
			},
			{
				"name": "acceptAmount",
				"type": "uint256"
			},
			{
				"name": "acceptedAmount",
				"type": "uint256"
			},
			{
				"name": "nextOrder",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "affPercent_",
		"outputs": [
			{
				"name": "",
				"type": "uint8"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "airDropPercent_",
		"outputs": [
			{
				"name": "",
				"type": "uint8"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "airDropPool_",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "airDropTracker_",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "feePercent_",
		"outputs": [
			{
				"name": "",
				"type": "uint8"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "playerAddr",
				"type": "address"
			}
		],
		"name": "getBalance",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "playerAddr",
				"type": "address"
			}
		],
		"name": "getCanAcceptAmount",
		"outputs": [
			{
				"name": "canAccept",
				"type": "uint256"
			},
			{
				"name": "earliest",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "playerAddr",
				"type": "address"
			}
		],
		"name": "getPlayerInfo",
		"outputs": [
			{
				"name": "totalAssets",
				"type": "uint256"
			},
			{
				"name": "nextPeriodAssets",
				"type": "uint256"
			},
			{
				"name": "balance",
				"type": "uint256"
			},
			{
				"name": "canAccept",
				"type": "uint256"
			},
			{
				"name": "airdrop",
				"type": "uint256"
			},
			{
				"name": "offered",
				"type": "uint256"
			},
			{
				"name": "accepted",
				"type": "uint256"
			},
			{
				"name": "affiliateEarned",
				"type": "uint256"
			},
			{
				"name": "siteEarned",
				"type": "uint256"
			},
			{
				"name": "nextUpdateTime",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "interestPeriod_",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "maxInterestTime_",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"name": "",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "address"
			},
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "playerAcceptOrders_",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "address"
			},
			{
				"name": "",
				"type": "uint256"
			}
		],
		"name": "playerOfferOrders_",
		"outputs": [
			{
				"name": "playerAddress",
				"type": "address"
			},
			{
				"name": "offerAmount",
				"type": "uint256"
			},
			{
				"name": "acceptAmount",
				"type": "uint256"
			},
			{
				"name": "affiliateAddress",
				"type": "address"
			},
			{
				"name": "siteOwner",
				"type": "address"
			},
			{
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"name": "interesting",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"name": "players_",
		"outputs": [
			{
				"name": "playerAddress",
				"type": "address"
			},
			{
				"name": "lastAffiliate",
				"type": "address"
			},
			{
				"name": "totalOffered",
				"type": "uint256"
			},
			{
				"name": "totalAccepted",
				"type": "uint256"
			},
			{
				"name": "airDroped",
				"type": "uint256"
			},
			{
				"name": "balance",
				"type": "uint256"
			},
			{
				"name": "offeredCount",
				"type": "uint256"
			},
			{
				"name": "acceptOrderCount",
				"type": "uint256"
			},
			{
				"name": "canAccept",
				"type": "uint256"
			},
			{
				"name": "lastCalcOfferNo",
				"type": "uint256"
			},
			{
				"name": "affiliateEarned",
				"type": "uint256"
			},
			{
				"name": "siteEarned",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "sitePercent_",
		"outputs": [
			{
				"name": "",
				"type": "uint8"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"name": "",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "xTokenPercent_",
		"outputs": [
			{
				"name": "",
				"type": "uint8"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}
]

;