const WebSocket = require("ws");

// P2P 서버 초기화 함수
function initP2PServer(portNum) {
  // portNum을 인자로 받아 그 포트번호로 웹 소켓 서버를 새로 만드는 server 변수 생성
  const server = new WebSocket.Server({ port: portNum });
  // 해당 서버가 연결되면
  server.on("connection", (ws) => {
    // 연결 초기화 함수 실행
    initConnection(ws);
  });
  console.log("웹 소켓 서버 " + portNum + "포트 초기화햇듬");
}
initP2PServer(6002);

// 내가 연결할 사람들 주소록
let sockets = [];

// 연결 초기화 함수
function initConnection(ws) {
  // 내 주소록에 메시지 주고받을 연락처 추가
  sockets.push(ws);
  // 메시지 수신했을 때 메뉴얼
  initMessageHandler(ws);
  // 에러 처리용
  initErrorHandler(ws);
  // 마지막 블록 달라고 제이슨 형식으로 변환해서 달라고 하기
  write(ws, queryLatestMsg());
}

// 연락처목록(소켓목록) 받아오는 함수
function getSockets() {
  return sockets;
}

// 받은 메시지를 제이슨 형식으로 변환해주는 녀석
function write(ws, message) {
  ws.send(JSON.stringify(message));
}

// 소문내기
function broadcast(message) {
  // 메시지를 내 주소록에 있는 모두에게 전송하기
  // sockets를 forEach로 돌려서
  sockets.forEach((socket) => {
    write(socket, message);
  });
  // 위 화살표 함수와 같은것
  // sockets.forEach(function (socket) {
  //   write(socket, message);
  // });
}

// Peers(다른이들)에 연결하는 함수
// httpServer.js 에서 웹 소켓 열어달란 요청(ws://localhost:6002 과 같은..)을 받아
function connectToPeers(newPeers) {
  // forEach로 요청받은 주소들 하나씩 열어주기
  newPeers.forEach((peer) => {
    // 요청받은 주소에 새로운 웹 소켓 서버를 ws 변수에 저장
    const ws = new WebSocket(peer);
    // 해당 웹 소켓이 열리면 연결 초기화 해주기
    ws.on("open", () => {
      console.log(peer + " 이 열렸어요!");
      initConnection(ws);
    });
    // 오류는 에러
    ws.on("error", () => {
      console.log("웹소켓 여는데 무언가 문제가 잇다고 말할 수 있어요");
    });
  });
}

// 다른이와 내 블록을 비교하기 위해 오가는 메시지의 종류 구분
const MessageType = {
  // 상대의 마지막 블록 내놔라 하고싶으면
  QUERY_LATEST: 0,
  // 상대의 블록 전부 내놔라 하고싶으면
  QUERY_ALL: 1,
  // 내 블록체인을 상대한테 숑숑 보내려면
  RESPONSE_BLOCKCHAIN: 2,
};

// 메시지 핸들러 (받은 메시지에 맞게 답장 보내주기)
function initMessageHandler(ws) {
  ws.on("message", (data) => {
    // 받은 메시지는 <buffer 7b 22 74 79 70 65...>
    // 이걸 제이슨 형식으로 바꿔서 저장
    const message = JSON.parse(data);
    // 메시지 타입 따라 분기
    switch (message.type) {
      // 0: 상대가 마지막 블록 내놓으라 그러면
      case MessageType.QUERY_LATEST:
        // 상대에게 내 마지막 블록 정보 보내기
        write(ws, responseLatestMsg());
        break;
      // 1: 상대가 블록 전체 달라고 그러면
      case MessageType.QUERY_ALL:
        // 상대에게 내 블록 전체를 보내줌
        write(ws, responseAllChainMsg());
        break;
      // 2: 상대가 나에게 블록을 담아서 보내줬음
      case MessageType.RESPONSE_BLOCKCHAIN:
        // 내 블록이랑 비교해보고 답장해주기
        handleBlockChainResponse(message);
        break;
    }
  });
}

// 내가 가지고 있는 블록 중 마지막 블록 메시지에 담기
function responseLatestMsg() {
  const { getLastBlock } = require("./chainedBlock2");
  return {
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify([getLastBlock()]),
  };
}
// 내가 가진 블록체인 메시지에 담기
function responseAllChainMsg() {
  const { getBlocks } = require("./chainedBlock2");
  return {
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify(getBlocks()),
  };
}

// 상대가 보내준 마지막 블록 or 블록체인 전체를 내 블록체인과 비교하여 답장하기
function handleBlockChainResponse(message) {
  const { getLastBlock } = require("./chainedBlock2");
  const { createHash } = require("./chainedBlock2");
  const { addBlock } = require("./chainedBlock2");
  const { replaceChain } = require("./chainedBlock2");

  // 메시지로 받은 객체 {타입, 블록} 에서 블록을 receiveBlocks에 담기
  // 받은 메시지를 제이슨 형식으로 변환하여 receiveBlocks에 담기
  const receiveBlocks = JSON.parse(message.data);

  // 메시지로 받은 블록체인 or 블록이 없으면 메시지 출력하고 아무것도 안하기
  if (receiveBlocks.length === 0) {
    console.log("메시지로 받은 블록체인이나 블록이 한개도 없어");
    return;
  }
  // 메시지로 받은 블록체인에서 마지막 블록을 변수에 담음
  const latestReceiveBlock = receiveBlocks[receiveBlocks.length - 1];
  const { isValidBlockStructure } = require("./chainedBlock2");
  if (!isValidBlockStructure(latestReceiveBlock)) {
    console.log("block structuture not valid");
    return;
  }
  // 내 블록의 마지막 블록을 변수에 담음
  const latesMyBlock = getLastBlock();

  // 메시지로 받은 마지막 블록의 인덱스가 내 마지막 블록 인덱스보다 크면
  // (내 블록체인보다 1개 이상 길면)
  if (latestReceiveBlock.header.index > latesMyBlock.header.index) {
    console.log(
      "내 블록체인의 인덱스보다 저놈이 준 블록체인의 인덱스가 더 크네!"
    );
    // 내 마지막 블록의 해시와 상대의 마지막 바로 이전 블록의 해시가 같으면
    // (내 블록보다 한 개 더 많은 경우)
    if (createHash(latesMyBlock) === latestReceiveBlock.header.previousHash) {
      // 내 블록체인에 상대 마지막 블록 연결하고
      if (addBlock(latestReceiveBlock)) {
        console.log("내거보다 한개 더 길구나 저 블록 내거에 연결하면 되겟다!");
        console.log("동네사람들! 저 블록 한개 새로 연결했음!");
        // 이 마지막블록 소식을 여기저기 전파하기
        broadcast(responseLatestMsg());
      }
      // 상대방이 나와 다른 블록체인이면서 한개 많은상태면 addBlock할때 검증에서 걸러짐
      // 만약 상대방이 내 블록체인과 똑같은 상태에서 다음블록으로 가짜를 준거라면
      // 난 가짜를 남들에게 전파하게 될 듯?

      // 위에서 내 마지막 블록과 상대가 준 블록의 인덱스를 비교해서
      // 내것이 더 짧아야 이곳에 들어오므로
      // 상대의 블록체인 말고 마지막 블록 한개를 받은것일때(이면서 2개이상 김)
    } else if (receiveBlocks.length === 1) {
      // 여기저기서 블록체인 받아서 비교하기도 하고 상대 블록체인도 받아서
      // 다시 위에서부터 검사해 내려올것임
      console.log("동네사람들! 여러분이 가진 블록체인 좀 줘봐요");
      broadcast(queryAllMsg());
    } else {
      // 상대 블록체인 길이가 2개 이상 긴 경우
      // 검증을 거쳐 블록체인 통으로 교체할것임(replaceChain)
      console.log("내가 가진 블록체인보다 쟤가 준 블록체인이 더 길어서");
      console.log("내거 버리고 새걸로 교체해야겟담");
      replaceChain(receiveBlocks);
    }
    // 메시지로 받은 블록체인이 내 블록체인보다 같거나 짧으면 아무것도 안하기
  } else {
    console.log(
      "전달 받은 블록체인이 내가 가진 블록체인보다 길지 않으니까 암것도 안할거야"
    );
  }
}

// 상대에게 블록체인 전부 달라고 하는 전갈
function queryAllMsg() {
  return {
    type: MessageType.QUERY_ALL, // 블록체인 줘
    data: null, // 달라고 하는것이므로 내가 보낼 블록 없음
  };
}

// 상대에게 마지막 블록 내놔보라고 하는 전갈
function queryLatestMsg() {
  return {
    type: MessageType.QUERY_LATEST, // 마지막 블록줘
    data: null, // 달라고 하는것이므로 내가 보낼 블록 없음
  };
}

// 연결 초기화 오류 핸들러
function initErrorHandler(ws) {
  // 연결이 닫혀도
  ws.on("close", () => {
    // 꺼버려
    closeConnection(ws);
    console.log("연결 닫힘");
  });
  // 연결에 오류가 나도
  ws.on("error", () => {
    // 꺼버려
    closeConnection(ws);
    console.log("연결 초기화 오류");
  });
}

// 연결 꺼버리는 함수
function closeConnection(ws) {
  console.log(`연결 멈춰! ${ws.url}`);
  // 연결이 끊어진 사람은 연락처에서 빼기
  sockets.splice(sockets.indexOf(ws), 1);
}

module.exports = {
  initP2PServer,
  connectToPeers,
  getSockets,
  broadcast,
  responseLatestMsg,
  responseAllChainMsg,
};
