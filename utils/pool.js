// 演示用户池：24 位，全部为虚构人物（不含任何真实个人数据）
// vec 是五维软性偏好的目标向量（0-100）：pace 生活节奏 / settle 定居意愿 / spend 消费观 / kids 生育意愿 / family 家庭边界
// edu：1 大专 2 本科 3 硕士 4 博士
const POOL = [
  { id: 1, name: '林知夏', gender: 'f', age: 29, city: '深圳', edu: 3, height: 165, job: '产品经理', tags: ['爱做饭', '猫奴', '周末爬山'], emo: '在深圳做产品五年，作息算规律，周末喜欢在家做饭、爬山，猫比我会社交。', vec: { pace: 60, settle: 70, spend: 40, kids: 65, family: 45 } },
  { id: 2, name: '苏晚', gender: 'f', age: 31, city: '深圳', edu: 2, height: 162, job: '会计', tags: ['会理财', '安静', '早睡'], emo: '账做得清，日子也想过得清。不太爱热闹，但认真聊天我可以聊到很晚。', vec: { pace: 55, settle: 68, spend: 45, kids: 60, family: 52 } },
  { id: 3, name: '周予安', gender: 'f', age: 27, city: '深圳', edu: 3, height: 168, job: '建筑设计师', tags: ['看展', '养绿植', '想定居'], emo: '画图到深夜是常态，但我坚持每周留一天给自己，想把生活落在深圳。', vec: { pace: 62, settle: 72, spend: 38, kids: 70, family: 48 } },
  { id: 4, name: '唐梨', gender: 'f', age: 33, city: '深圳', edu: 2, height: 160, job: '护士', tags: ['顾家', '会照顾人', '不熬夜'], emo: '医院三班倒，所以我特别珍惜能一起吃饭的时间，家人对我来说很重要。', vec: { pace: 50, settle: 60, spend: 55, kids: 45, family: 60 } },
  { id: 5, name: '陈砚', gender: 'm', age: 30, city: '深圳', edu: 3, height: 178, job: '后端工程师', tags: ['跑步', '看书', '话不多'], emo: '下班跑步，周末看书。不太会开场，但认准一个人就会很稳定。', vec: { pace: 58, settle: 65, spend: 45, kids: 58, family: 55 } },
  { id: 6, name: '江叙', gender: 'm', age: 32, city: '深圳', edu: 2, height: 175, job: '中学老师', tags: ['规律作息', '会做饭', '顾家'], emo: '教书第七年，作息比闹钟准。喜欢把家里收拾干净，也愿意陪长辈吃饭。', vec: { pace: 52, settle: 66, spend: 42, kids: 62, family: 58 } },
  { id: 7, name: '何岸', gender: 'm', age: 28, city: '深圳', edu: 4, height: 180, job: '科研', tags: ['马拉松', '理性', '话直'], emo: '做研究的人容易较真，我在改。跑马拉松教会我的是一步步来。', vec: { pace: 64, settle: 60, spend: 50, kids: 55, family: 44 } },
  { id: 8, name: '沈彻', gender: 'm', age: 35, city: '深圳', edu: 3, height: 176, job: '律师', tags: ['稳重', '想安定', '爱做饭'], emo: '忙的时候连轴转，但我知道自己要什么样的生活——在深圳安下来，有人等我回家。', vec: { pace: 48, settle: 72, spend: 40, kids: 68, family: 62 } },
  { id: 9, name: '许青', gender: 'f', age: 30, city: '广州', edu: 2, height: 163, job: '编辑', tags: ['慢生活', '顾家', '爱煲汤'], emo: '在广州长大，离不开这里的烟火气。家里的汤煲得好，是我的底气。', vec: { pace: 45, settle: 55, spend: 60, kids: 50, family: 70 } },
  { id: 10, name: '温亭', gender: 'f', age: 28, city: '广州', edu: 3, height: 167, job: '市场', tags: ['外向', '爱旅行', '能喝'], emo: '一年飞十几个城市，见的人多了反而更想找个能安静聊天的。', vec: { pace: 70, settle: 45, spend: 35, kids: 40, family: 50 } },
  { id: 11, name: '池月', gender: 'f', age: 33, city: '广州', edu: 2, height: 161, job: '设计师', tags: ['独立', '有边界', '爱干净'], emo: '我喜欢把生活安排得干净利落，也希望能和另一半保持彼此的空间。', vec: { pace: 57, settle: 63, spend: 44, kids: 58, family: 53 } },
  { id: 12, name: '罗聿', gender: 'm', age: 31, city: '广州', edu: 2, height: 174, job: '餐饮创业', tags: ['会做饭', '实在', '想结婚'], emo: '开了两家小店，忙但不乱。我想找的是能一起吃夜宵、也能一起算账的人。', vec: { pace: 42, settle: 50, spend: 65, kids: 55, family: 72 } },
  { id: 13, name: '顾宁', gender: 'f', age: 32, city: '上海', edu: 3, height: 166, job: '投行', tags: ['节奏快', '目标清晰', '爱健身'], emo: '强度大、节奏快，但我把健身和旅行排在日程表上，不会让生活只剩工作。', vec: { pace: 66, settle: 75, spend: 60, kids: 52, family: 48 } },
  { id: 14, name: '白露', gender: 'f', age: 29, city: '上海', edu: 4, height: 164, job: '医生', tags: ['博士', '理性', '想安定'], emo: '读书读得久，现在只想把生活过稳。对的人是能一起沉默也不尴尬的那种。', vec: { pace: 38, settle: 68, spend: 30, kids: 66, family: 42 } },
  { id: 15, name: '邵闻', gender: 'm', age: 33, city: '上海', edu: 3, height: 179, job: '咨询顾问', tags: ['会沟通', '爱读书', '出差多'], emo: '一年有一半时间在出差，所以更珍惜相处的时间，也更懂沟通的重要。', vec: { pace: 60, settle: 70, spend: 55, kids: 58, family: 50 } },
  { id: 16, name: '严清', gender: 'f', age: 31, city: '北京', edu: 3, height: 165, job: '法务', tags: ['边界强', '爱独处', '想定居'], emo: '我很清楚自己要什么：稳定的城市、清晰的边界、不被打扰的周末。', vec: { pace: 30, settle: 78, spend: 28, kids: 72, family: 40 } },
  { id: 17, name: '舒和', gender: 'f', age: 27, city: '北京', edu: 2, height: 168, job: '插画师', tags: ['自由职业', '宅', '爱猫'], emo: '在家画画，一周出门两三次。宅但不闷，只是需要有人愿意陪我待着。', vec: { pace: 72, settle: 40, spend: 68, kids: 30, family: 45 } },
  { id: 18, name: '裴野', gender: 'm', age: 34, city: '北京', edu: 3, height: 182, job: '影视制片', tags: ['爱电影', '稳重', '想成家'], emo: '在片场待久了，最想要的是回家有人一起看一部旧电影。', vec: { pace: 55, settle: 74, spend: 50, kids: 64, family: 66 } },
  { id: 19, name: '阮软', gender: 'f', age: 26, city: '杭州', edu: 2, height: 160, job: '电商运营', tags: ['爱逛', '乐天', '会做甜品'], emo: '杭州的天气我还没习惯，但这里的茶和甜品治愈我。想找个能一起逛菜场的人。', vec: { pace: 58, settle: 52, spend: 42, kids: 44, family: 38 } },
  { id: 20, name: '陆迟', gender: 'm', age: 29, city: '杭州', edu: 3, height: 177, job: '算法工程师', tags: ['内向', '爱骑行', '节俭'], emo: '骑行的路上想事情最清楚。生活简单，钱花在装备上，其他都很省。', vec: { pace: 50, settle: 58, spend: 38, kids: 50, family: 42 } },
  { id: 21, name: '姜禾', gender: 'f', age: 30, city: '成都', edu: 2, height: 162, job: '茶艺师', tags: ['慢', '顾家', '会做饭'], emo: '成都的节奏刚好适合我。喜欢煮茶、做饭，也喜欢一大家子热热闹闹。', vec: { pace: 35, settle: 42, spend: 62, kids: 48, family: 74 } },
  { id: 22, name: '梁舟', gender: 'm', age: 32, city: '成都', edu: 2, height: 176, job: '户外教练', tags: ['运动', '阳光', '爱旅行'], emo: '带团爬山、露营，晒得黑。想把周末交给山野，也想有人一起。', vec: { pace: 68, settle: 48, spend: 58, kids: 56, family: 60 } },
  { id: 23, name: '孟夏', gender: 'f', age: 28, city: '成都', edu: 3, height: 166, job: '高校教师', tags: ['规律', '爱读书', '想结婚'], emo: '教书、读书、偶尔写点东西。日子平淡但我喜欢，想找个同样想安定的人。', vec: { pace: 62, settle: 60, spend: 48, kids: 62, family: 55 } },
  { id: 24, name: '韩序', gender: 'm', age: 27, city: '成都', edu: 2, height: 173, job: '咖啡师', tags: ['会做咖啡', '随性', '爱音乐'], emo: '自己开小店，日子随性但认真。不着急定城市，先遇到对的人再说。', vec: { pace: 44, settle: 62, spend: 72, kids: 40, family: 52 } }
];

function byId(id) {
  for (let i = 0; i < POOL.length; i += 1) {
    if (POOL[i].id === Number(id)) return POOL[i];
  }
  return null;
}

const EDU_NAME = { 1: '大专', 2: '本科', 3: '硕士', 4: '博士' };

module.exports = {
  POOL: POOL,
  byId: byId,
  EDU_NAME: EDU_NAME
};
