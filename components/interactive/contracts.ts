/** The contract playground's starting points: small, complete, and each showing one thing. */

export interface ContractTemplate {
  id: string;
  label: string;
  source: string;
}

export const TEMPLATES: ContractTemplate[] = [
  {
    id: 'counter',
    label: 'Counter',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A counter anyone can move. Each change emits an event, decoded from the receipt below.
contract Counter {
    uint256 public count;
    address public lastCaller;

    event Changed(address indexed by, uint256 count);

    function increment() external {
        add(1);
    }

    function add(uint256 amount) public {
        count += amount;
        lastCaller = msg.sender;
        emit Changed(msg.sender, count);
    }
}
`,
  },
  {
    id: 'guestbook',
    label: 'Guestbook',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Sign the book. Signed from the post-quantum account, an entry's author is that account's
/// 20-byte ID; from the classic key, its 0x address.
contract Guestbook {
    struct Entry {
        address author;
        string message;
        uint256 blockNumber;
    }

    Entry[] private entries;

    event Signed(address indexed author, uint256 indexed index, string message);

    function sign(string calldata message) external {
        require(bytes(message).length > 0 && bytes(message).length <= 280, "1 to 280 bytes");
        entries.push(Entry(msg.sender, message, block.number));
        emit Signed(msg.sender, entries.length - 1, message);
    }

    function total() external view returns (uint256) {
        return entries.length;
    }

    function entry(uint256 index) external view returns (address author, string memory message, uint256 blockNumber) {
        Entry storage e = entries[index];
        return (e.author, e.message, e.blockNumber);
    }
}
`,
  },
  {
    id: 'token',
    label: 'ERC-20 token',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A minimal ERC-20: the whole supply goes to whoever deploys it. (Native QRDX tokens, made
/// with TOKEN_DEPLOY, trade on the exchange; an ERC-20 lives in the EVM alone.)
contract Token {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint256 wholeTokens) {
        name = name_;
        symbol = symbol_;
        totalSupply = wholeTokens * 10 ** decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _move(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        _move(from, to, value);
        return true;
    }

    function _move(address from, address to, uint256 value) private {
        require(balanceOf[from] >= value, "balance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
`,
  },
];
