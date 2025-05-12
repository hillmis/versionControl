//使用方法
//在head内添加<meta name="description" content="你的应用描述或一句话">
//在需要打开关于页面的地方使用toabout();
//改js整合了关于和更新窗口，数据自动获取，webapp可快捷复用，只需要修改web.json的地址，以及meta描述
//后续可在关于窗口添加赞赏名单

// 全局状态变量
let latestUpdateData = null;   // 保存最新的更新数据
let lastCheckTimestamp = 0;    // 记录最后检查时间戳
const CHECK_INTERVAL = 300000; // 5分钟检查间隔（单位：毫秒）
const MIN_VISIBLE_CHECK = 120000; // 可见检查最小间隔


// 版本比较函数（严格处理相等情况）
const compareVersions = (current, latest) => {
    const currentNum = Number(current);
    const latestNum = Number(latest);

    if (isNaN(currentNum) || isNaN(latestNum)) {
        console.error('版本号格式错误:', { current, latest });
        return false;
    }

    return latestNum > currentNum;
};

// 创建弹窗结构（仅执行一次）
function createUpdateDialog() {
    if (document.getElementById('updateOverlay')) return;

    const dialog = document.createElement('div');
    dialog.innerHTML = `
        <div id="updateOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0,0,0,0.4); z-index: 9999; backdrop-filter: blur(3px); padding: 20px; box-sizing: border-box; display: flex; justify-content: center; align-items: center;">
            <div style="background: #ffffff; width: min(95%, 480px); max-height: 90vh; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); overflow: hidden; display: flex; flex-direction: column; animation: modalSlide 0.3s ease-out;">
                <div style="padding: 24px; background: linear-gradient(135deg, #f8f9fa, #f3f4f6); border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 16px; color: #1f2937;">
                        <div style="width: 42px; height: 42px; background:rgb(41, 201, 97); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white;">
                            <svg viewBox="0 0 24 24" width="24" height="24" style="fill: currentColor">
                                <path d="M14.8 3.8l2.6 5.1 5.8.9c.6.1.8.8.4 1.2l-4.2 4.3 1 5.7c.1.6-.5 1.1-1.1.8L12 18.3l-5 2.7c-.6.3-1.2-.2-1.1-.8l1-5.7-4.2-4.3c-.4-.4-.2-1.1.4-1.2l5.8-.9 2.6-5.1c.3-.6 1.1-.6 1.4 0z"/>
                            </svg>
                        </div>
                        <h3 style="margin: 0; font-size: 1.3rem; font-weight: 600; line-height: 1.4;">发现新版本</h3>
                    </div>
                </div>
                <div id="updateContent" style="flex: 1; padding: 24px; overflow-y: auto; scrollbar-width: thin; line-height: 1.6; color: #4a5568;"></div>
                <div style="padding: 20px 24px; background: #f8f9fa; border-top: 1px solid rgba(0,0,0,0.1); display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="updateCancel" style="padding: 10px 24px; background: #f1f3f5; border: 1px solid #e9ecef; border-radius: 8px; color: #4a5568; font-weight: 500; cursor: pointer; transition: all 0.2s;">稍后再说</button>
                    <button id="updateConfirm" style="padding: 10px 24px; background: rgb(41, 201, 97); border: none; border-radius: 8px; color: white; font-weight: 500; cursor: pointer; transition: all 0.2s;">立即更新</button>
                </div>
            </div>
        </div>
        <style>
            @keyframes modalSlide { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            #updateContent::-webkit-scrollbar { width: 6px; }
            #updateContent::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
            @media (max-width: 480px) { 
                #updateOverlay { padding: 12px; }
                #updateOverlay > div { width: 100% !important; border-radius: 12px; }
            }
        </style>
    `;
    document.body.appendChild(dialog);

    // 立即绑定取消按钮事件
    document.getElementById('updateCancel').addEventListener('click', handleCancel);
}

// 取消按钮通用处理
function handleCancel() {
    document.getElementById('updateOverlay').style.display = 'none';
    webapp.toast('已延迟更新', 2000);
    lastCheckTimestamp = Date.now(); // 重置检查时间
}

// 显示更新内容（仅在版本不同时调用）
function showUpdate(data) {
    latestUpdateData = data;
    const overlay = document.getElementById('updateOverlay');
    const content = document.getElementById('updateContent');
    const currentVersion = webapp.getpage();

    // 动态更新内容
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid rgba(0,0,0,0.05);">
                <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 12px;">当前版本</div>
                <div style="font-size: 1.3rem; color: #2dca76; font-weight: 600;">v${currentVersion}</div>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid rgba(0,0,0,0.05);">
                <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 12px;">最新版本</div>
                <div style="font-size: 1.3rem; color: #2dca76; font-weight: 600;">v${data.versionName}</div>
            </div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.05);">
            <div style="font-size: 0.95rem; line-height: 1.7;">${data.description.replace(/\n/g, '<br>')}</div>
        </div>
        ${data.forceUpdate ? `
        <div style="margin-top: 24px; padding: 16px; background: #fff8e5; border-radius: 8px; border: 1px solid rgba(255, 167, 0, 0.2); display: flex; align-items: center; gap: 12px; color: #e65100;">
            <svg viewBox="0 0 24 24" width="20" height="20" style="fill: currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div style="font-size: 0.9rem;">本次为强制更新，请立即升级</div>
        </div>
        ` : ''}
    `;

    // 处理强制更新
    if (data.forceUpdate) {
        document.getElementById('updateCancel').style.display = 'none';
        webapp.revert(() => webapp.toast('请先完成更新', 3000));
    } else {
        document.getElementById('updateCancel').style.display = 'inline-block';
    }

    // 绑定确认按钮事件
    const confirmBtn = document.getElementById('updateConfirm');
    confirmBtn.onclick = () => {
        checkPermissionAndDownload(data.downloadUrl);
        overlay.style.display = 'none';
    };

    overlay.style.display = 'flex';
}

// 权限检查与下载
async function checkPermissionAndDownload(url) {
    try {
        if (!webapp.bestow()) {
            await new Promise((resolve, reject) => {
                webapp.rights();
                webapp.behold(status => {
                    if (status === 0) resolve();
                    else reject('权限被拒绝');
                });
            });
        }
        webapp.browse(url);
        
    } catch (error) {
        console.error('下载失败:', error);
    }
}

// 核心更新检查逻辑
async function checkUpdate() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/hillmis/hillmusic/main/web.json');
        if (!response.ok) throw `HTTP错误: ${response.status}`;

        const data = await response.json();
        if (!data.versionCode || !data.versionName) {
            throw '无效的版本数据格式';
        }

        const localCode = webapp.getcode();

        // 只有当版本不同时才继续处理
        if (compareVersions(localCode, data.versionCode)) {
            // 确保弹窗已创建
            createUpdateDialog();
            // 显示更新内容
            showUpdate(data);
        }else{
            webapp.toast('已是最新版本');
        }
        let serverCode = data.versionCode;
        console.log('版本检查:',
            `本地: ${localCode} (${typeof localCode})`,
            `服务器: ${serverCode} (${typeof serverCode})`
        );

    } catch (error) {
        console.log('更新检查失败:', error);
    } finally {
        lastCheckTimestamp = Date.now();
    }
}
// 关于弹窗函数
function toAbout() {
    const currentVersion = webapp.getpage();
    
    // 创建弹窗容器
    const popup = document.createElement('div');
    popup.id = 'aboutPopup';
    popup.className = 'popup-container hidden';

    // 点击外部关闭弹窗
    popup.addEventListener('click', (e) => {
        if (e.target === popup) popup.classList.add('hidden');
    });

    // 弹窗内容容器
    const content = document.createElement('div');
    content.className = 'content-container';

    // 标题
    const title = document.createElement('h2');
    appName = webapp.getname();
    title.className = 'popup-title';
    title.textContent = `${appName}`;

    // 文本内容容器
    const textContainer = document.createElement('div');
    textContainer.className = 'text-container';

    // 版本信息 - 可点击的版本号
    const version = document.createElement('p');
    version.textContent = `版本: v${currentVersion}`;
    version.style.cursor = 'pointer';
    version.style.color = '#fdba74';
    version.addEventListener('click', async () => {
        popup.classList.add('hidden');
        checkUpdate();
      
    });

    // 作者链接
    const authorLink = document.createElement('a');
    authorLink.href = 'https://home.liu13.fun';
    authorLink.className = 'author-link';
    const author = document.createElement('p');
    author.textContent = '作者: 山雾~';
    authorLink.appendChild(author);

    // 赞助部分
    const donateSection = document.createElement('div');
    donateSection.className = 'donate-section';

    // 赞助标题
    const donateTitle = document.createElement('h3');
    donateTitle.className = 'donate-title';
    donateTitle.textContent = '投喂开发者';

    // 二维码容器
    const qrContainer = document.createElement('div');
    qrContainer.className = 'qr-container';

    // 支付宝二维码
    const alipay = document.createElement('div');
    const alipayText = document.createElement('p');
    alipayText.className = 'qr-text';
    alipayText.textContent = '支付宝';
    const alipayImg = document.createElement('img');
    alipayImg.className = 'qr-image';
    alipayImg.src = 'https://s3.bmp.ovh/imgs/2025/05/07/1565fff5085e314b.png';
    alipay.append(alipayText, alipayImg);

    // 微信二维码
    const wechat = document.createElement('div');
    const wechatText = document.createElement('p');
    wechatText.className = 'qr-text';
    wechatText.textContent = '微信';
    const wechatImg = document.createElement('img');
    wechatImg.className = 'qr-image';
    wechatImg.src = 'https://s3.bmp.ovh/imgs/2025/05/07/44ac595a875326bb.png';
    wechat.append(wechatText, wechatImg);

    qrContainer.append(alipay, wechat);

    // 感谢文本
    const thanks = document.createElement('p');
    thanks.className = 'thanks-text';
    thanks.textContent = '感谢您的支持，我们将持续改进！';

    // 组装元素
    // 通过 querySelector 选择器获取网页描述
    const metaDescription = document.querySelector('meta[name="description"]').content;
    donateSection.append(donateTitle, qrContainer, thanks);
    textContainer.append(
        document.createTextNode(`${metaDescription}`),
        version,
        authorLink,
        donateSection
    );
    content.append(title, textContainer);
    popup.appendChild(content);
    document.body.appendChild(popup);

    // 显示弹窗
    setTimeout(() => popup.classList.remove('hidden'), 10);
}

// 初始化逻辑
function init() {
    // 立即执行首次检查
    checkUpdate();

    // 定时后台检查
    setInterval(() => {
        if (document.hidden) return; // 后台不主动请求
        if (Date.now() - lastCheckTimestamp > CHECK_INTERVAL) {
            checkUpdate();
        }
    }, 60000); // 每分钟检查一次定时

    // 页面可见性变化处理
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // 切换到后台时处理强制更新
            if (latestUpdateData?.forceUpdate) {
                webapp.secede();
            }
        } else {
            // 切换到前台时条件检查
            const timeSinceLastCheck = Date.now() - lastCheckTimestamp;
            if (timeSinceLastCheck > MIN_VISIBLE_CHECK) {
                checkUpdate();
            }
        }
    });
}

// 添加CSS样式
const style = document.createElement('style');
style.textContent = `
/* 基础样式 */
.hidden { display: none !important; }

/* 弹窗容器 */
.popup-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 内容容器 */
.content-container {
    padding: 1.5rem;
    border-radius: 0.75rem;
    max-width: 28rem;
    width: 100%;
    margin: 0 1rem;
    position: relative;
}

/* 标题样式 */
.popup-title {
    font-size: 1.5rem;
    color: white;
    margin-bottom: 1rem;
    text-align: center;
}

/* 文本容器 */
.text-container {
    color: #d1d5db;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 0.875rem;
    text-align: center;
}

/* 作者链接 */
.author-link {
    color: #fdba74;
    text-decoration: none;
}
.author-link:hover { text-decoration: underline; }

/* 赞助区块 */
.donate-section {
    padding-top: 1rem;
    border-top: 1px solid #4b5563;
    margin-top: 0.75rem;
}

.donate-title {
    font-size: 1.125rem;
    text-align: center;
    color: white;
    margin-bottom: 0.5rem;
}

/* 二维码相关 */
.qr-container {
    display: flex;
    justify-content: center;
    gap: 1rem;
}

.qr-text {
    margin-bottom: 0.25rem;
    text-align: center;
}

.qr-image {
    width: 8rem;
    height: 8rem;
    background-color: #e5e7eb;
    border-radius: 0.25rem;
}

.thanks-text {
    font-size: 0.75rem;
    color: #6b7280;
    text-align: center;
    margin-top: 0.5rem;
}
`;
document.head.appendChild(style);

// DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


