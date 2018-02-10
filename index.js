var market_price = [400, 500, 800, 2500, 150000];//市场价,http://dog.chengxuyuan.info/查询，市场波动大，请频繁手动修改

var sale_price = market_price.map(function (e) {
    return e * 0.999 - 10
});//出手价,默认以市场价乘以0.999-10的价格出售，以求快速出手
var limit = market_price.map(function (e) {
    return e * 0.95 - 200;
});//最低买入价，默认只买入0.95倍-200价格的狗
var querySortType = "CREATETIME_DESC";//"CREATETIME_DESC"：时间从晚到早，"RAREDEGREE_ASC"：稀有度"AMOUNT_ASC"：价格从低到高

//易源验证码https://www.showapi.com/api/sku/184
var code_name = '';
var code_sign = '';

function loadScript(url) {
    return new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        if (script.readyState) {
            script.onreadystatechange = function () {
                if (script.readyState == "loaded" || script.readyState == "complete") {
                    script.onreadystatechange = null;
                    resolve();
                };
            };
        } else {
            script.onload = resolve;
        };
        script.src = url;
        document.body.appendChild(script);
    });
};
(function (f) {
    var jss = [];
    if (typeof jQuery !== "function") {
        jss.push("//cdn.bootcss.com/jquery/3.2.1/jquery.js");
    };
    Promise.all(jss.map(function (e) {
        return loadScript(e);
    })).then(function () {
        Promise
            .all(["//cdn.bootcss.com/layer/3.1.0/layer.js"].map(function (e2) {
                return loadScript(e2);
            })
            ).then(f);
    });
})(function () {
    $ = jQuery;
    var mill_interval = 2001;

    var myAmount = 1800;
    var pageNo = 5;

    var call_count = {
        getCodeImg: 0,
        getCodeStr: 0,
        getList: 0,
        buy: 0,
        sale: 0,
    };//统计每个方法调用次数
    var success_count = {
        getCodeImg: 0,
        getCodeStr: 0,
        getList: 0,
        buy: 0,
        sale: 0,
    };//统计每个方法调用次数
    var degree_0_avg = 2000;//普通的均价

    check();
    start();
    setInterval(function () {
        listMyPet();
    }, 10000);

    var degreeName = ['普通', '稀有', '卓越', '史诗', '神话', '传说'];

    function start() {
        listOrder(function (isBuying) {
            if (isBuying) {
                console.log("购买或出售中，等待");
                setTimeout(function () {
                    start();
                }, 5000);
            } else {
                getCodeImg();
            };
        });
    };

    function consoleState() {
        console.log(`申请验证码数：${call_count.getCodeImg}`);
        console.log(`读取列表数：${call_count.getList},读取数据条数：${call_count.getList * 20},`);
        console.log(`购买尝试次数：${call_count.buy},购买成功次数：${success_count.buy},`);
        console.log(`尝试出售次数：${call_count.sale},出售成功次数：${success_count.sale},`);
    };

    function formatterDateTime() {
        var date = new Date();
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        if (month < 10) {
            month = "0" + month;
        };
        var day = date.getDate();
        if (day < 10) {
            day = "0" + day;
        };
        var hours = date.getHours();
        if (hours < 10) {
            hours = "0" + hours;
        };
        var minutes = date.getMinutes();
        if (minutes < 10) {
            minutes = "0" + minutes;
        };
        var seconds = date.getSeconds();
        if (seconds < 10) {
            seconds = "0" + seconds;
        };
        var datetime = year + month + day + hours + minutes + seconds;
        return datetime;
    };

    function consoleSales(list) {
        var min = new Array(degreeName.length).fill('')
        list.forEach(function (e, i) {
            var amount = e.amount;
            var rareDegree = e.rareDegree;
            if (min[rareDegree] != "") {
                if (min[rareDegree] > amount) {
                    min[rareDegree] = amount;
                };
            } else {
                min[rareDegree] = amount;
            };
        });
        var info = Object.keys(min).filter(function (e, i) {
            return min[e] != "";
        }).map(function (e, i) {
            return [degreeName[e], min[e]];
        });
        console.log(JSON.stringify(info), '当前个人总微积分：' + myAmount, '当前设置市场价' + JSON.stringify(market_price));
    };

    function getCodeImg() {
        call_count.getCodeImg++;
        $.ajax({
            url: '//pet-chain.baidu.com/data/captcha/gen',
            data: {
                appId: 1,
                requestId: new Date().valueOf(),
                tpl: ''
            },
            success: function (data) {
                var img = data.data.img;
                var seed = data.data.seed;
                getCodeStr(img, seed);

                success_count.getCodeImg++;
            }
        });
    };

    function getCodeStr(img, seed) {
        call_count.getCodeStr++;
        $.ajax({
            type: 'post',
            url: '//route.showapi.com/184-5',
            dataType: 'json',
            data: {
                "showapi_timestamp": formatterDateTime(),
                "showapi_appid": code_name,
                "showapi_sign": code_sign,
                "img_base64": img,
                "typeId": "34",
                "convert_to_jpg": "0"
            },
            error: function (XmlHttpRequest, textStatus, errorThrown) {
                console.log("出错了", XmlHttpRequest, textStatus, errorThrown);
            },
            success: function (result) {
                var code = result.showapi_res_body.Result;
                getList(seed, code);
                success_count.getCodeImg++;
            }
        });
    };

    function getList(seed, code) {
        var interval = setInterval(function () {
            call_count.getList++;
            $.ajax({
                url: '//pet-chain.baidu.com/data/market/queryPetsOnSale',
                data: JSON.stringify({
                    appId: 1,
                    lastAmount: null,
                    lastRareDegree: null,
                    pageNo: 1,
                    pageSize: 20,
                    petIds: [],
                    querySortType: querySortType,
                    requestId: new Date().valueOf(),
                    tpl: ""
                }),
                contentType: 'application/json;charset=UTF-8',
                type: 'post',
                success: function (data) {
                    if (data.errorMsg == "success") {
                        var list = data.data.petsOnSale;
                        buy(code, list, seed, interval);
                        success_count.getList++;
                    } else {
                        console.log("获取列表失败：" + data.errorMsg);
                    }
                }
            });
        }, mill_interval);
    };

    function buy(code, list, seed, interval) {
        var degree_0 = list.filter(function (e, i) { return i > 3 && e.rareDegree == 0 });
        degree_0_avg = degree_0.map(function (e) { return +e.amount }).reduce(function (e1, e2) { return e1 + e2 }) / degree_0.length;

        if (querySortType == "AMOUNT_ASC") {
            console.log(`当前普通狗市场价：${degree_0_avg}`);
        };
        consoleSales(list);

        var yes = list.filter(function (pet, i) {
            var amount = pet.amount - 0;
            var rareDegree = pet.rareDegree;
            return amount < limit[rareDegree] && amount < myAmount;
        }).sort(function (e1, e2) {
            if (e1.rareDegree == e2.rareDegree) {
                return e2.amount - e1.amount;
            } else {
                return e1.rareDegree - e2.rareDegree;
            };
        });

        if (yes.length > 0) {
            var pet = yes[Math.random() * yes.length | 0];
            var petId = pet.petId;
            var validateCode = pet.validCode;
            var amount = pet.amount;
            var requestId = new Date().valueOf();
            var rareDegree = pet.rareDegree;

            clearInterval(interval);
            console.log(`尝试购买价格位${amount}，等级为${degreeName[rareDegree]}的狗`);
            call_count.buy++;
            $.ajax({
                url: '//pet-chain.baidu.com/data/txn/create',
                data: JSON.stringify({
                    amount: amount,
                    appId: 1,
                    captcha: code,
                    petId: petId,
                    requestId: requestId,
                    seed: seed,
                    tpl: "",
                    validCode: validateCode
                }),
                contentType: 'application/json;charset=UTF-8',
                type: 'post',
                success: function (data) {
                    console.log(amount, degreeName[rareDegree], data.errorMsg);

                    if (data.errorMsg == "success") {
                        success_count.buy++;
                    };
                },
                complete: function () {
                    consoleState();
                    start();
                }
            });
        };
    };

    function listMyPet(callback) {
        $.ajax({
            url: '//pet-chain.baidu.com/data/user/pet/list',
            data: JSON.stringify({
                pageNo: 1,
                pageSize: 10,
                pageTotal: -1,
                requestId: new Date().valueOf(),
                appId: 1,
                tpl: ""
            }),
            contentType: 'application/json;charset=UTF-8',
            type: 'post',
            success: function (data) {
                var list = data.data.dataList;
                //petId
                list.filter(function (e, i) {
                    return e.shelfStatus != 1;
                }).filter(function (e, i) {
                    return i < 1;
                }).forEach(function (e, i) {
                    var petId = e.petId;
                    var rareDegree = e.rareDegree;
                    if (querySortType == "AMOUNT_ASC") {
                        if (rareDegree == 0) {
                            var amount = degree_0_avg - 10;
                            if (amount < limit[0] + 5) {
                                return;
                            };
                        };
                        if (rareDegree == 1) {
                            var amount = degree_0_avg + 150;
                            if (amount < limit[1] + 5) {
                                return;
                            };
                        };
                    } else {
                        amount = sale_price[rareDegree];
                    };
                    if (amount) {
                        sale(petId, amount, rareDegree);
                    };
                });
            }
        });
    };

    function listOrder(callback) {
        $.ajax({
            url: '//pet-chain.baidu.com/data/user/order/list',
            data: JSON.stringify({
                pageNo: 1,
                pageSize: 10,
                pageTotal: -1,
                requestId: new Date().valueOf(),
                appId: 1,
                tpl: ""
            }),
            contentType: 'application/json;charset=UTF-8',
            type: 'post',
            success: function (data) {
                var list = data.data.dataList;
                //txnStatus
                var isBuying = list.some(function (e, i) {
                    return e.txnStatus == 1;//1上链中
                });
                callback(isBuying);
            }
        });
        check(true);
    };

    function sale(petId, amount, rareDegree, callback) {
        call_count.sale++;
        $.ajax({
            url: '//pet-chain.baidu.com/data/market/salePet',
            data: JSON.stringify({
                petId: petId,
                amount: amount.toFixed(2),
                requestId: new Date().valueOf(),
                appId: 1,
                tpl: ""
            }),
            contentType: 'application/json;charset=UTF-8',
            type: 'post',
            success: function (data) {
                var success = data.errorMsg;
                console.log(`出售价格为${amount},等级为${degreeName[rareDegree]}的狗,${success}`);
                if (typeof callback == "function") {
                    callback(success);
                };
                if (success == "success") {
                    success_count.sale++;
                };
            }
        });
    };

    function check(async) {
        $.ajax({
            url: '//pet-chain.baidu.com/data/user/get',
            data: JSON.stringify({
                requestId: 1518145045609,
                appId: 1,
                tpl: ""
            }),
            contentType: 'application/json;charset=UTF-8',
            type: 'post',
            async: async,
            success: function (data) {
                myAmount = data.amount;
            }
        });
    };
});