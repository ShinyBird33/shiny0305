const express = require('express')
const app = express()
const port = 5000
const fetch = require('node-fetch')
require('dotenv').config()
const axios = require('axios')
var ledger = {}
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/oauth2/access_token', async (req, res) => {
    var code = req.query.code;
    var precode = req.query.pre_auth_code;

    axios.get(process.env.VUE_APP_TOKEN_URL + `/api/v1/oauth2/access_token?app_id=${process.env.VUE_APP_APP_ID}&app_key=${process.env.VUE_APP_APP_SECRET}&code=${code}&pre_auth_code=${precode}`)
        .then(result => {
            res.send(result.data)
        })
})


app.get('/oauth2/refresh_token', async (req, res) => {
    var token = req.query.refresh_token;

    axios.get(process.env.VUE_APP_TOKEN_URL + `/api/v1/oauth2/refresh_token?app_id=${process.env.VUE_APP_APP_ID}&app_key=${process.env.VUE_APP_APP_SECRET}&refresh_token=${token}`)
        .then(result => {
            res.send(result.data)
        })
})
app.get('/donate', async (req, res) => {

    var amount = parseInt(req.query.amount, 10)
    var from = req.query.from
    var token = req.query.token
    if (ledger[from]) {
        ledger[from] += amount
    } else {
        ledger[from] = amount
    }

    console.log(ledger[from])
    if (ledger[from] >= 10) {
        //first check if you already have the badge
        var response = await fetch(process.env.VUE_APP_API_HOST + `api/v1/oauth2/badge/token?contract=${process.env.VUE_APP_BADGE_ADDRESS}`, {
            headers: { 'Access-Token': token }
        });
        var data = await response.json();
        console.log(data)
        if (data.code == 200 && data.data && data.data.tokenId == 0) {
            response = await fetch(process.env.VUE_APP_API_HOST + `api/v1/oauth2-app/nft/owner_mint`, {
                method: 'POST',
                body: JSON.stringify({ 'contract_address': process.env.VUE_APP_BADGE_ADDRESS, 'eth_address': from }),
                headers: {
                    'Content-Type': 'application/json',
                    'appid': process.env.VUE_APP_APP_ID,
                    'appkey': process.env.VUE_APP_APP_SECRET
                }
            });
            var data = await response.json();
            console.log(data)
            res.send('Very Nice. You get a badge!' + data)
        } else {
            response = await fetch(process.env.VUE_APP_API_HOST + `api/v1/oauth2-app/nft/upgrade_np`, {
                method: 'POST',
                body: JSON.stringify({ 'contract_address': process.env.VUE_APP_BADGE_ADDRESS, 'eth_addresses': [from], "np": amount }),
                headers: {
                    'Content-Type': 'application/json',
                    'appid': process.env.VUE_APP_APP_ID,
                    'appkey': process.env.VUE_APP_APP_SECRET
                }
            });
            var data = await response.json();
            console.log(data)
            res.send('Very Nice. You upgraded the badge!')
        }
    }
    else {
        res.send('Nice but no badge')
    }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})