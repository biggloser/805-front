
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'echarts/lib/chart/graph'; // 引入图表类型
const app = createApp(App)
app.use(ElementPlus)

app.use(router)

app.mount('#app')
