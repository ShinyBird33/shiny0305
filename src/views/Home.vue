<template>
  <div class="home">
    <div>
      This is a nuvo demo
    </div>
    <div>
      switchAccount:<el-switch
          v-model="switchAccount"
          active-color="#13ce66"
          inactive-color="#ff4949">
      </el-switch>
    </div>
    
    <br/>
    <div>
      <br/>
      <div>
        <el-button type="primary" @click="startOauth2New">Login</el-button>
      </div>
    </div>
  </div>
</template>

<script>
// @ is an alias to /src
import {Oauth2Client, WebSocketClient} from '@metis.io/middleware-client'
import {PolisClient} from '@metis.io/middleware-client'

export default {
  name: 'Home',
  components: {},
  data() {
    return {
      appId: process.env.VUE_APP_APP_ID,
      // appId:"611cc74139481700e8885bc5", //polis
      returnUrl: process.env.VUE_APP_RETURN_URL,
      returnUrl2: process.env.VUE_APP_RETURN_URL2,
      apiHost: process.env.VUE_APP_API_HOST,
      switchAccount: false,
      chainId:1088,
      pre_code:"",
      polisclient:null,
      address:"0xf1181bd15E8780B69a121A8D8946cC1C23972Bd4"
    }
  },
  mounted() {
    // console.log(Oauth2Client, WebSocketClient)
    const opts = {
      appId:this.appId,
      chainId:this.chainId,
      // apiHost: "https://polis-test.meits.io",
      apiHost: this.apiHost

    }
    this.polisclient = new PolisClient(opts);
    this.polisclient.on('debug',function (data){
      console.log("debug",data)
    })

  },
  methods: {
    startOauth2() {
      console.log(this.appId);
      let oauth2Client = new Oauth2Client(this.apiHost);
      oauth2Client.startOauth2(this.appId, this.returnUrl, false, this.switchAccount);

    },
    savePreCode(){
      localStorage.setItem("precode",this.pre_code)
    },
    startOauth2New() {
      this.savePreCode();      
      const authOps = {
        appId: this.appId,
        returnUrl: this.returnUrl2,
        switchAccount: this.switchAccount
      }
      //user login auth
      this.polisclient.startOauth2(authOps);
    },
    startOauth2WC() {
      this.savePreCode();
      const authOps = {
        appId: this.appId,
        returnUrl: "http://polis.localhost:8000/#/wc",
        switchAccount: this.switchAccount
      }
      //user login auth
      this.polisclient.startOauth2(authOps);
    },
    clientGetBalance() {
      this.polisclient.web3Provider.getBalance(this.address).then( res => {
        alert(res)
      }).catch((err)=>{
        console.log("err:",err);
        alert(err)
      })
    }
  }
}
</script>
