const fs = require("fs");
const ecdsa = require("elliptic"); // 타원 곡선 디지털 서명 알고리즘
const ec = new ecdsa.ec("secp256k1");

// 비밀키 들어갈 경로는 wallet/PRIVATE_KEY환경변수      또는 wallet/default얏
const privateKeyLocation =
  "node2/wallet/" + (process.env.PRIVATE_KEY || "default");
// 비밀키는 지갑 경로에 비밀키 private_key 라고 만들고양
const privateKeyFile = privateKeyLocation + "/private_key";

// 지갑 초기화
function initWallet() {
  // 지갑에 비밀키가 이미 있으면 있다고 알려주고 건너뛰기
  if (fs.existsSync(privateKeyFile)) {
    console.log("지갑(" + privateKeyLocation + ")에 비밀키가 이미 있어요");
    return;
  }
  // 지갑 경로가 없으면 경로 생성
  if (!fs.existsSync("node2/wallet/")) {
    fs.mkdirSync("node2/wallet/");
    console.log("새 지갑을 장만었어요");
  }
  // 지갑 경로가 없으면 경로 생성
  if (!fs.existsSync(privateKeyLocation)) {
    fs.mkdirSync(privateKeyLocation);
    console.log("새 지갑에 열쇠함을 장만었어요");
  }
  // 비밀키 코드 생성해서 newPrivateKey변수에 담고
  const newPrivateKey = generatePrivateKey();
  // 비밀키 파일안에 슉 슈슉 슉 기입하기
  fs.writeFileSync(privateKeyFile, newPrivateKey);
  console.log("새 비밀키는 지갑(" + privateKeyLocation + ")에 있어요");
}
initWallet();

// 비밀키 암호 생성 해주는 함수
function generatePrivateKey() {
  // genKeyPair로 랜덤한 키 쌍을 생성
  const keyPair = ec.genKeyPair();
  // 키 쌍의 priv 부분만 가져와서
  console.log("keyPair!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.log(keyPair);
  const privateKey = keyPair.getPrivate();
  console.log("privateKey!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.log(privateKey);
  console.log(
    "privateKey tostring!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  );
  console.log(privateKey.toString(16)); // private_key 파일의 내용과 동일
  // 16진수로 변환
  return privateKey.toString(16);
}

// 지갑에서 비밀키 가져오는 함수
function getPrivateKeyFromWallet() {
  // 비밀키 파일의 내용을 그대로 buffer에 담아서 반환해주기
  const buffer = fs.readFileSync(privateKeyFile, "utf8");
  return buffer.toString();
}

// 지갑에서 공개키 만들어내는 함수
function getPublicKeyFromWallet() {
  // 지갑에서 비밀키를 가져와서
  const privateKey = getPrivateKeyFromWallet();
  // 키 쌍으로 되돌려서
  const key = ec.keyFromPrivate(privateKey, "hex");

  // 공개키 형식으로 변환하여 16진수 130자리 코드로 반환
  return key.getPublic().encode("hex");
}

module.exports = {
  getPublicKeyFromWallet,
};
