App = {
    web3Provider: null,
    contracts: {},
    admins: [],
    storeOwners: [],

    init: async function () {
        return App.initWeb3();
    },

    initWeb3: async function () {

        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.enable();

            }
            catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        }

        return App.initContract();
    },

    initContract: function () {

        $.when(
            $.getJSON('Marketplace.json', function (data) {
                var MarketplaceArtifact = data;
                App.contracts.Marketplace = TruffleContract(MarketplaceArtifact);
                App.contracts.Marketplace.setProvider(App.web3Provider);
            }),
        ).then(function () {
            return App.isAdmin();
        });

        return App.bindEvents();
    },

    bindEvents: function () {
        window.ethereum.on('accountsChanged', function (accounts) {
            window.location.href='/';
        })
    },

    isAdmin: function () {

        let mp_contract;

        web3.eth.getAccounts(function (error, accounts) {
            if (error) {
                console.log(error);
            }

            let account = accounts[0];

            App.contracts.Marketplace.deployed().then(function (instance) {
                mp_contract = instance;
                return mp_contract.isAdministrator();

            }).then(function (is_admin) {

                if (is_admin) {
                    $('#user-greeting').text("Hello Administrator");
                    $('#user-address').text(account);

                    return App.getAdmins();
                }
                else {
                    alert("You are not an admin.");
                    window.location.href = '/';
                }
            });
        });
    },

    getAdmins: function () {

        let mp_contract;

        web3.eth.getAccounts(function (error, accounts) {
            if (error) {
                console.log(error);
            }

            App.contracts.Marketplace.deployed().then(function (instance) {
                mp_contract = instance;
                return mp_contract.getAdministrators();

            }).then(function (admins) {

                App.admins = admins;
                console.log(App.admins);
                App.getStoreOwners();
            });
        });
    },

    getStoreOwners: function () {

        let mp_contract;

        web3.eth.getAccounts(function (error, accounts) {
            if (error) {
                console.log(error);
            }

            App.contracts.Marketplace.deployed().then(function (instance) {
                mp_contract = instance;
                return mp_contract.getStoreOwners();

            }).then(function (owners) {

                App.storeOwners = owners;
                App.adminView();
            });
        });
    },

    adminView: function () {

        $("#admin-view").show();

        $("#so-address-to-add").val('');

        // populate list of admin addresses
        $("#admin-list").html('');
        let template = $("#admin-list-entry-template");
        for (let i = 0; i < App.admins.length; i++) {

            console.log(App.admins[i]);
            template.find(".list-group-item").html(App.admins[i]);
            $("#admin-list").append(template.html());
        }

        $("#so-list").html('');
        template = $("#so-list-entry-template");
        for (let i = 0; i < App.storeOwners.length; i++) {

            console.log(App.storeOwners[i]);
            template.find(".list-group-item").html(App.storeOwners[i]);
            $("#so-list").append(template.html());
        }
    },

    addStoreOwner: function (event) {

        event.preventDefault();

        let address_to_add = $("#so-address-to-add").val();

        if (address_to_add == '' || address_to_add == undefined) {
            alert("Address not specified")
            return;
        }

        if (App.admins.includes(address_to_add)) {
            alert("Address is an owner, cannot be added as a store owner");
            return;
        }

        if (App.storeOwners.includes(address_to_add)) {
            alert("Address is already a store owner");
            return;
        }

        let mp_contract;
        web3.eth.getAccounts(function (error, accounts) {

            if (error) {
                console.log(error);
            }
            var account = accounts[0];

            App.contracts.Marketplace.deployed().then(function (instance) {
                mp_contract = instance;
                return mp_contract.addStoreOwner(address_to_add, {from: account});
            }).then(function (result) {
                App.getStoreOwners();
            });

        });
    }
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});