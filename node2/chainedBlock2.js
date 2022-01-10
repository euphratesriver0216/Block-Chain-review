const fs = require("fs");
const merkle = require("merkle");
const cryptojs = require("crypto-js");
const random = require("random");
const P2P_SERVER = require("./p2pServer2");

// 블록 클래스 정의
class Block {
  constructor(header, body) {
    this.header = header;
    this.body = body;
  }
}

// 블록의 헤더부분에 들어갈 클래스 정의
class BlockHeader {
  constructor(
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty,
    nonce
  ) {
    this.version = version;
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.merkleRoot = merkleRoot;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }
}

// 블록체인 = Blocks
// 최초 블록(genesisBlock) 만들어서 첫번째 블록으로 저장
let Blocks = [createGenesisBlock()];

// 내 블록체인 불러오는 함수
function getBlocks() {
  return Blocks;
}

// 내 블록체인의 마지막(최신) 블록 불러오는 함수
function getLastBlock() {
  return Blocks[Blocks.length - 1];
}

// package.json에 들어있는 버전 가져오는 함수
function getVersion() {
  const package = fs.readFileSync("package.json");
  return JSON.parse(package).version;
}

// 최초블록 만드는 함수 (최초블록은 컴퓨터가 찾는게 아니라 사람이 임의로 정의함)
function createGenesisBlock() {
  const index = 0; // 인덱스
  const version = getVersion(); // 버전
  const previousHash = "0".repeat(64); // 이전 해시
  // 비트코인의 최초블록이 만들어진 시간
  // 이후엔 만들어진 시간을 1초단위로 표시할거임 parseInt(Date.now() / 1000);
  const timestamp = 1231006505; // 2009/01/03 6:15pm (UTC)
  const body = [
    // 블록 이름
    "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks",
  ];
  const tree = merkle("sha256").sync(body);
  const merkleRoot = tree.root() || "0".repeat(64);
  const difficulty = 0; // 난이도 0으로 시작
  const nonce = 0; // 앞으로 해시찾으면서 삽질할 때마다 늘어날 삽질 수

  // 생성자로 헤더 구성하여
  const header = new BlockHeader(
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty,
    nonce
  ); // 블록으로 만들어 반환
  return new Block(header, body);
}

// 해시 만들어주는 함수
function createHash(data) {
  const {
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty,
    nonce,
  } = data.header;
  const blockString =
    version +
    index +
    previousHash +
    timestamp +
    merkleRoot +
    difficulty +
    nonce;
  // 클래스에 들어있는 것들을 다 더해서 SHA256를 통해 암호화하여 나온
  // 16진수 64자리 임의의 문자열의 값을 hash에 담아 반환한다
  const hash = cryptojs.SHA256(blockString).toString();
  return hash;
}

// 다음 블록 채굴을 위해 해시 계산하는 함수
function calculateHash(
  version,
  index,
  previousHash,
  timestamp,
  merkleRoot,
  difficulty,
  nonce
) {
  const blockString =
    version +
    index +
    previousHash +
    timestamp +
    merkleRoot +
    difficulty +
    nonce;
  const hash = cryptojs.SHA256(blockString).toString();
  return hash;
}

// 다음 블록을 만들 때
function nextBlock(bodyData) {
  const prevBlock = getLastBlock(); // 이전블록은 가장 마지막 블록
  const version = getVersion(); // 버전
  const index = prevBlock.header.index + 1; // 이전블록의 인덱스에 +1
  const previousHash = createHash(prevBlock); //
  const timestamp = parseInt(Date.now() / 1000);
  const tree = merkle("sha256").sync(bodyData);
  const merkleRoot = tree.root() || "0".repeat(64);
  const difficulty = getDifficulty(getBlocks());
  // const nonce = 0;

  const header = findBlock(
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty
  );

  return new Block(header, bodyData);
}

// const block1 = nextBlock(["chamchi"]);
// console.log(block1);

// 블록 추가하는 함수
// function addBlock(bodyData) {
//   // 들어온 인자(bodyData)로 새 블록을 만들고
//   // const newBlock = nextBlock([bodyData]);
//   // push로 Blocks에 배열 젤 뒤에 넣는다
//   Blocks.push(newBlock);
// }
// function addBlock(newBlock) {
//   Blocks.push(newBlock);
// }

// 블록 구조가 유효한지
// 현재 블록의 인덱스가 이전 블록의 인덱스보다 1만큼 큰지
// 이전 블록의 해시값과 현재 블록의 이전 해시가 같은지
// 데이터 필드로부터 계산한 머클루트와 블록 헤더의 머클루트가 동일한지

function isValidBlockStructure(block) {
  return (
    typeof block.header.version === "string" &&
    typeof block.header.index === "number" &&
    typeof block.header.previousHash === "string" &&
    typeof block.header.timestamp === "number" &&
    typeof block.header.merkleRoot === "string" &&
    typeof block.header.difficulty === "number" &&
    typeof block.header.nonce === "number" &&
    typeof block.body === "object"
  );
}

// 새 블록 검증하기
function isValidNewBlock(newBlock, previousBlock) {
  if (isValidBlockStructure(newBlock) === false) {
    console.log("새 블록이 구조체의 조건에 맞지 않습니다");
    return false;
  } else if (newBlock.header.index !== previousBlock.header.index + 1) {
    console.log("새 블록 인덱스랑 이전블록 인덱스+1이 다릅니다");
    return false;
  } else if (createHash(previousBlock) !== newBlock.header.previousHash) {
    console.log("새 블록의 이전해시값이랑 이전 블록의 해시값이 다름");
    return false;
  } else if (
    (newBlock.body.length === 0 &&
      "0".repeat(64) !== newBlock.header.merkleRoot) ||
    (newBlock.body.length !== 0 &&
      merkle("sha256").sync(newBlock.body).root() !==
        newBlock.header.merkleRoot)
  ) {
    console.log("머클루트 잘못됨");
    return false;
  } else if (!isValidTimestamp(newBlock, previousBlock)) {
    console.log("시간이 잘못됐어");
    return false;
  } else if (
    // 새로 만든 블록으로 난이도 검증
    !hashMatchesDifficulty(createHash(newBlock), newBlock.header.difficulty)
  ) {
    console.log("해시가 잘못됨");
    return false;
  }
  console.log("검증완료");
  return true;
}

// 블록 추가하기
function addBlock(newBlock) {
  if (isValidNewBlock(newBlock, getLastBlock())) {
    Blocks.push(newBlock);

    return true;
  }
  return false;
}

// 체인 검증하기
function isValidChain(newBlocks) {
  if (JSON.stringify(newBlocks[0]) !== JSON.stringify(Blocks[0])) {
    return false;
  }

  var tempBlocks = [newBlocks[0]];
  for (let i = 1; i < newBlocks.length; i++) {
    if (isValidNewBlock(newBlocks[i], tempBlocks[i - 1])) {
      tempBlocks.push(newBlocks[i]);
    } else {
      return false;
    }
  }
  return true;
}

// 내 블록체인 다른이에게 전달받은 블록체인으로 교체해주는 함수
function replaceChain(newBlocks) {
  // 다른이에게 받은 블록체인이 검증 됐으면
  if (isValidChain(newBlocks)) {
    if (
      // 그 블록체인이 내 블록체인보다 길면 ||(또는)
      newBlocks.length > Blocks.length ||
      // 양 블록체인이 길이가 같을때 && 그냥 복불복 random.boolean()
      (newBlocks.length === Blocks.length && random.boolean())
    ) {
      // 내 블록체인을 전달받은 블록체인으로 교체하고
      Blocks = newBlocks;
      // 이 새로운 블록체인의 마지막 블록을 널리 알리기
      P2P_SERVER.broadcast(P2P_SERVER.responseLatestMsg());
    }
  } else {
    // 애초에 이 함수에 들어오는 조건이 내 블록체인보다 전달받은 블록체인이 길어야하는데
    // (handleBlockChainResponse에서 인덱스 크기로 비교했었음)
    // 전달받은 블록체인이 내것보다 인덱스는 큰데 길이가 짧으면 뭔가 잘못된 블록체인인것.
    console.log("받은 원장에 문제가 잇음");
  }
}

// 받은 16진수 인자를 2진수로 휘리릭
function hexToBinary(Hexadecimal) {
  const lookupTable = {
    0: "0000",
    1: "0001",
    2: "0010",
    3: "0011",
    4: "0100",
    5: "0101",
    6: "0110",
    7: "0111",
    8: "1000",
    9: "1001",
    A: "1010",
    B: "1011",
    C: "1100",
    D: "1101",
    E: "1110",
    F: "1111",
  };
  // 2진수 문자열을 담을 변수
  let binary = "";

  // 16진수를 하나씩 넣어서 (예를 들면 48E2F19같은,)
  for (let i = 0; i < Hexadecimal.length; i++) {
    // 16진수를 2진수로 변환할 값이 일치하는 녀석을 찾아
    if (lookupTable[Hexadecimal[i]]) {
      // binary변수에 차곡차곡
      binary += lookupTable[Hexadecimal[i]];
      // 0~F 외의 인자가 들어오면 null (암것도 안나옴)
    } else {
      return null;
    }
  }
  return binary;
}

// 난이도에 따라 찾을 해시값 바꿔주는 함수
function hashMatchesDifficulty(hash, difficulty) {
  // 16진수로 된 해시를 2진수로 바꿔서 hashBinary에 담기
  // (10~15에 해당하는 a~f는 toUpperCase로 대문자로 변경)
  const hashBinary = hexToBinary(hash.toUpperCase());
  // 난이도만큼 해시의 앞글자에 0을 붙이기 위한 변수
  const requirePrefix = "0".repeat(difficulty);
  // hashBinary와 requirePrefix의 시작부분이 같으면 true 아니면 false
  return hashBinary.startsWith(requirePrefix);
}

// 다음 블록 찾기(정답 nonce 찾기)
function findBlock(
  currentVersion,
  nextIndex,
  previousHash,
  nextTimestamp,
  merkleRoot,
  difficulty
) {
  let nonce = 0;
  while (true) {
    let hash = calculateHash(
      currentVersion,
      nextIndex,
      previousHash,
      nextTimestamp,
      merkleRoot,
      difficulty,
      nonce
    );
    if (hashMatchesDifficulty(hash, difficulty)) {
      return new BlockHeader(
        currentVersion,
        nextIndex,
        previousHash,
        nextTimestamp,
        merkleRoot,
        difficulty,
        nonce
      );
    }
    nonce++;
  }
}

const BLOCK_GENERATION_INTERVAL = 10; // second 블록 생성 간격(10초마다)
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10; // in blocks 난이도 조정 간격(블록 10개마다)
// 난이도 가조왕
function getDifficulty(blocks) {
  // 마지막 블록 변수
  const lastBlock = blocks[blocks.length - 1];
  if (
    // (처음 생성된)제네시스 블록이 아니고,
    lastBlock.header.index !== 0 &&
    // 블록이 10번째 때 마다
    lastBlock.header.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0
  ) {
    // 난이도 조정 함수로 난이도를 조정하고
    return getAdjustDifficulty(lastBlock, blocks);
  }
  // (조정된)난이도를 반환
  return lastBlock.header.difficulty;
}

// 난이도 조정
function getAdjustDifficulty(lastBlock, blocks) {
  // 이전에 난이도가 조정된 블록
  const prevAdjustmentBlock =
    // = 현재 마지막 블록의 10번째 전
    blocks[blocks.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  // 경과 시간
  const elapsedTime =
    // = 10번째 전에 블록이 만들어지고부터 마지막 블록이 만들어질 때 까지
    lastBlock.header.timestamp - prevAdjustmentBlock.header.timestamp;
  // 예상 시간
  const expectedTime =
    // = 10개 만드는
    BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;

  // 예상시간/2 가 실제경과시간보다 크면
  if (expectedTime / 2 > elapsedTime) {
    // 난이도를 1 올림
    return prevAdjustmentBlock.header.difficulty + 1;
    // 예상시간*2 가 실제경과시간보다 작으면
  } else if (expectedTime * 2 < elapsedTime) {
    // 난이도를 1 내림
    return prevAdjustmentBlock.header.difficulty - 1;
  } else {
    return prevAdjustmentBlock.header.difficulty;
  }
}

// 현재시간 만드는 함수
function getCurrentTimestamp() {
  // 날짜(Date)에서 시간(getTime)을 초단위로 만들어(/1000) 반올림한(round) 값을 반환
  return Math.round(new Date().getTime() / 1000);
}

// 네트워크 시간의 오차 허용 범위
function isValidTimestamp(newBlock, prevBlock) {
  // 나보다 느린시간 60초까지 온것만 허용
  if (prevBlock.header.timestamp - newBlock.header.timestamp > 60) return false;
  // 나보다 빠른시간 60초까지 허용
  if (newBlock.header.timestamp - getCurrentTimestamp() > 60) return false;
  return true;
}


module.exports = {
  Blocks,
  createHash,
  getLastBlock,
  nextBlock,
  getVersion,
  getBlocks,
  addBlock,
  isValidTimestamp,
  isValidBlockStructure,
  hashMatchesDifficulty,
  replaceChain,
};
