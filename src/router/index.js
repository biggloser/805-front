import { createRouter, createWebHistory } from 'vue-router'
import graph from "@/components/graph.vue"
const routes = [
  {path:'/graph',component:graph,name:'graph'},
]
const router = createRouter({
  history: createWebHistory(),//使用hash模式,如果使用history模式，则需要配置服务器
  routes
});

//设置动态路由
export default router
