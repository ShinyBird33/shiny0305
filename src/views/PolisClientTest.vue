<template>
  <div class="about">
    <h1>This is an Nuvo Demo App</h1>
    <div style="margin-top: 20px;">
      <div v-if="errMsg" style="color: red;">{{ errMsg }}</div>
    </div>
    <div>
      <div v-if="accessToken">
        <el-button type="primary" @click="disconnect">Disconnect</el-button>
        
        <el-row :gutter="20">
          <!--user action-->
          <el-col :span="6">
            <el-card class="box-card">
              <div slot="header" class="clearfix">
                <span>1. User action</span>
              </div>
              amount:
              <el-input placeholder="amount" v-model="donate_amount" />
              result:
              <el-input type="textarea" rows="4" v-model="result"></el-input>
              <el-button type="primary" @click="donate">Donate
              </el-button>
            </el-card>
          </el-col>
          <!--user profile-->
          <el-col :span="10">
            <el-card class="box-card">
              <div slot="header" class="clearfix">
                <span>2. User Profile Refresh</span>
              </div>
              username:
              <el-input placeholder="amount" v-model="username" />
              <img :src="badgeimg" width="100px"/>
              level:
              <el-input v-model="badgelevel" />
              state:
              <el-input v-model="badgestate" />
              RP:
              <el-input v-model="badgeRP" />

            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="box-card">
              <div slot="header" class="clearfix">
                <span>3. Authentication</span>
              </div>
              Only accessible by badge owners
              <div v-if="badgelevel > 0">
                You have access
              </div>
              <div v-else>
                You don't have access
              </div>
              <el-button type="primary" @click="checkbadge">Access</el-button>
            </el-card>
          </el-col>
        </el-row>
      </div>
      <div v-else>
        Access token not ready yet
        <el-button type="primary" @click="goRefreshToken">refresh TOKEN</el-button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { PolisClient, PolisProvier, Oauth2Client } from '@metis.io/middleware-client'
import Swal from 'sweetalert2'
import router from '../router';


/**
 * Warning: this page is just a demo
 * Under production module, access_token getting should place to server code like Java, C#, PHP ...
 */

export default {
  data() {
    return {
      bridgeMetaMask: true,
      appid: process.env.VUE_APP_APP_ID,
      appsecret: process.env.VUE_APP_APP_SECRET,
      apiHost: process.env.VUE_APP_API_HOST,
      code: '',
      accessToken: '',
      refreshToken: '',
      expiresIn: 1800,
      errMsg: '',
      websocket: null,
      wsConnected: false,
      polisclient: null,
      showFreshBtn: true,
      badgelevel: 0,
      badgeRP: 0,
      badgedata: "",
      badgestate: 0,
      nft_detail: {},
      result: "",
      chainid: 1088,
      userInfo: "",
      userObj: {},
      username: "",
      oauthInfo: {},
      loadingDialog: Swal.mixin({}),
      value: "",
      pre_auth_code: "",
      message: "",
      donate_amount: "",
    }
  },
  created() {
    //NOTE get confirm tx
    window.addEventListener("message", (event) => {
      if (event.data && event.data.tx) {
        // TODO here
        // console.log(`tx callback ${event.data.tx}`)
      }
    }, false);
    this.pre_auth_code = localStorage.getItem("precode")
    console.log("pre code:", this.pre_auth_code);

  },
  mounted() {
    this.code = this.$route.query.code || ''
    this.getAccessToken();

  },
  computed: {
    badgeimg() {
      if (this.badgelevel > 0) {
    
        return this.nft_detail.levels[this.badgelevel-1].badge_url
      }
      else {
        return "https://uploads-ssl.webflow.com/63cde137a9b7eb72d25c5fce/63e9cb5ebc6a9a7f05c8abc1_Group%20105.png"
      }
    }
  },
  methods: {
    loading() {
      this.loadingDialog.fire({
        html: "Processing...",
        didOpen: () => {
          Swal.showLoading();
        }
      });
    },
    async checkexpiry() {
      this.expiresIn = localStorage.getItem("tokenexpire")

      if (!this.accessToken) {
        return
      }
      else if (this.expiresIn <= Date.now()) {
        await this.goRefreshToken();
      }
    }
    ,
    closeLoading() {
      this.loadingDialog.close();
    }
    ,
    disconnect() {
      // window.open( 'http://localhost:1024/#/oauth2-logout','','height=200,width=200,top=-100,left=-100');
      this.polisclient.connect(this.oauthInfo, this.bridgeMetaMask);
      this.polisclient.disconnect()
        .then(res => {
          console.log("logout success:", res)
        })
        .catch(res => {
          console.log("logout error:", res)
        })
    },
    initPolisClient(data) {
      this.oauthInfo = data;
      this.polisclient = new PolisClient({
        appId: this.appid,
        chainId: this.chainid,
        apiHost: this.apiHost
      })

      this.polisclient.on('debug', function (data) {
        console.log('debug data:%s', JSON.stringify(data));
      })
      this.polisclient.on('tx-confirm', function (data) {
        console.log('tx-confirm', data)
      });
      this.polisclient.on('error', function (data) {
        console.log('error:', data instanceof Error)
      });

      this.polisclient.on('chainChanged', (chainId) => {
        console.log('polis-client print chainId =>', chainId);
      });
      this.polisclient.on('accountsChanged', (account) => {
        console.log('polis-client print account =>', account);
      });
    },
    async setupBadgeInfo() {
      await this.checkexpiry()
      if (this.accessToken) {
        this.oauth2Client = new Oauth2Client(this.apiHost);

        this.oauth2Client.getUserInfoAsync(this.accessToken).then(res => {
          this.userObj = res;
          this.username = res.display_name;
          console.log("user info:" + JSON.stringify(this.userObj))
        })

        const response = await fetch(process.env.VUE_APP_API_HOST + `api/v1/oauth2/nft/nft_detail?contract_address=${process.env.VUE_APP_BADGE_ADDRESS}`, {
          headers: { 'Access-Token': this.accessToken }
        })
        var data = await response.json();
        console.log(data)
        if (data.code == 200 && data.data) {
          this.nft_detail = data.data;
          console.log(process.env.VUE_APP_API_HOST + `api/v1/oauth2/badge/token?contract=${process.env.VUE_APP_BADGE_ADDRESS}&address=${this.userObj.eth_address}`)
          const response = await fetch(process.env.VUE_APP_API_HOST + `api/v1/oauth2/badge/token?contract=${process.env.VUE_APP_BADGE_ADDRESS}&address=${this.userObj.eth_address}`, {
            headers: { 'Access-Token': this.accessToken }
          });
          var data = await response.json();
          console.log(data)
          if (data.code == 200 && data.data && data.data.tokenId != "0") {
            this.badgelevel = parseInt(data.data.level, 10);
            this.badgeRP = parseInt(data.data.RP);
            this.badgedata = data.data.data;
            this.badgestate = data.data.state;
          }
        }
      }
    },
    goRefreshToken() {
      let refresh_token = localStorage.getItem("refresh-token");
      return axios.get(`/api/oauth2/refresh_token?refresh_token=${refresh_token}`)
        .then(res => {
          console.log(res)
          if (res.status == 200 && res.data && res.data.code == 200) {
            this.accessToken = res.data.data.access_token
            this.refreshToken = res.data.data.refresh_token
            this.expiresIn = Date.now() + res.data.data.expires_in * 1000
            localStorage.setItem("access-token", this.accessToken)
            localStorage.setItem("refresh-token", this.refreshToken)
            localStorage.setItem("tokenexpire", this.expiresIn)
            console.log("auth info:", res.data.data)
            this.initPolisClient(res.data.data)
            this.errMsg = "";
          } else if (res.status == 200 && res.data) {
            this.errMsg = res.data.msg
            router.push("/home")
          }
        })
    },
    getAccessToken() {
      if (this.code) {
        // axios.get(`https://polis.metis.io/api/v1/oauth2/access_token?app_id=${this.appid}&app_key=${this.appsecret}&code=${this.code}`)
        console.log(`/api/oauth2/access_token?code=${this.code}&pre_auth_code=${this.pre_auth_code}`)
        axios.get(`/api/oauth2/access_token?code=${this.code}&pre_auth_code=${this.pre_auth_code}`)
          .then(async res => {
            console.log(res)
            if (res.status == 200 && res.data && res.data.code == 200) {
              this.accessToken = res.data.data.access_token
              this.refreshToken = res.data.data.refresh_token
              this.expiresIn = Date.now() + res.data.data.expires_in * 1000
              localStorage.setItem("access-token", this.accessToken)
              localStorage.setItem("refresh-token", this.refreshToken)
              localStorage.setItem("tokenexpire", this.expiresIn)
              this.errMsg = ""
              console.log("auth info:", res.data.data)

              this.initPolisClient(res.data.data);

            } else if (res.status == 200 && res.data) {
              this.errMsg = res.data.msg
              await this.goRefreshToken()
              this.showFreshBtn = false;
            } else {
              this.showFreshBtn = false;
            }
            await this.setupBadgeInfo()
          })
      }
      else {
        this.accessToken = localStorage.getItem("access-token")
        this.expiresIn = localStorage.getItem("tokenexpire")
        console.log(this.accessToken)
        console.log(this.expiresIn)
        if (!this.accessToken) {
          return
        }
        else if (this.expiresIn <= Date.now) {
          this.goRefreshToken();
        }
        this.setupBadgeInfo()
      }
    }
    ,


    async checkbadge() {
      router.push("/secret")
    },

    async donate() {
      await this.checkexpiry()
      axios.get(`/api/donate?token=${this.accessToken}&amount=${this.donate_amount}&from=${this.userObj.eth_address}`)
        .then(async res => {
          if (res.status == 200 && res.data && res.data.code == 200) {
            await setupBadgeInfo()
            console.log(res.data)
          } else if (res.status == 200 && res.data) {
            this.errMsg = res.data.msg  
            setTimeout(this.setupBadgeInfo, 2000)
            this.showFreshBtn = false;
          } else {
            this.showFreshBtn = false;
          }
        })
    },
  }
}
</script>

<style>
.el-button {
  margin-top: 10px;
}

.about {
  background-color: beige;
}
</style>
