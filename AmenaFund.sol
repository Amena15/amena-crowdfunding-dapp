// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AmyFund
 * @dev A decentralized crowdfunding smart contract with refund mechanism
 */
contract AmenaFund {
    // State variables
    address public owner;
    uint256 public goal;
    uint256 public deadline;
    uint256 public amountRaised;
    uint256 public contributorCount;
    uint256 public constant MINIMUM_CONTRIBUTION = 0.01 ether;
    bool public goalReached;
    bool public fundingClosed;

    mapping(address => uint256) public contributions;
    address[] public contributors;

    // Events
    event FundReceived(address indexed contributor, uint256 amount, uint256 timestamp);
    event GoalReached(uint256 totalAmount, uint256 timestamp);
    event Refunded(address indexed contributor, uint256 amount, uint256 timestamp);
    event FundsWithdrawn(address indexed owner, uint256 amount, uint256 timestamp);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier beforeDeadline() {
        require(block.timestamp < deadline, "Deadline has passed");
        _;
    }

    modifier afterDeadline() {
        require(block.timestamp >= deadline, "Deadline has not passed yet");
        _;
    }

    modifier goalNotReached() {
        require(!goalReached, "Goal has already been reached");
        _;
    }

    modifier validContribution() {
        require(msg.value >= MINIMUM_CONTRIBUTION, "Contribution must be at least 0.01 ETH");
        _;
    }

   /**
     * @dev Initialize contract with goal and duration (minutes)
     */
    constructor(uint256 _goal, uint256 _durationInMinutes) {
        require(_goal > 0, "Goal must be greater than 0");
        require(_durationInMinutes > 0, "Duration must be greater than 0");

        owner = msg.sender;
        goal = _goal;
        deadline = block.timestamp + (_durationInMinutes * 1 minutes);
        amountRaised = 0;
        contributorCount = 0;
        goalReached = false;
        fundingClosed = false;
    }

     /**
     * @dev Accept contributions before deadline
     */
    function contribute() external payable beforeDeadline validContribution {
        require(!fundingClosed, "Funding is closed");

        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
            contributorCount++;
        }

        contributions[msg.sender] += msg.value;
        amountRaised += msg.value;

        if (amountRaised >= goal && !goalReached) {
            goalReached = true;
            emit GoalReached(amountRaised, block.timestamp);
        }

        emit FundReceived(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Returns current raised amount
     */
    function checkBalance() external view returns (uint256) {
        return amountRaised;
    }

    /**
     * @dev Owner withdraws funds if goal is reached
     */
    function withdraw() external onlyOwner {
        require(goalReached, "Goal not reached");
        require(amountRaised > 0, "No funds to withdraw");

        uint256 amount = amountRaised;
        amountRaised = 0;
        fundingClosed = true;

        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(owner, amount, block.timestamp);
    }

    /**
     * @dev Contributors request refund if goal not met after deadline
     */
    function refund() external afterDeadline goalNotReached {
        require(contributions[msg.sender] > 0, "No contribution found");

        uint256 contributionAmount = contributions[msg.sender];
        contributions[msg.sender] = 0;
        amountRaised -= contributionAmount;

        (bool success, ) = payable(msg.sender).call{value: contributionAmount}("");
        require(success, "Refund transfer failed");

        emit Refunded(msg.sender, contributionAmount, block.timestamp);
    }

    /**
     * @dev Get comprehensive contract details
     * @return _goal Target goal in wei
     * @return _deadline Deadline timestamp
     * @return _amountRaised Current amount raised
     * @return _contributorCount Number of unique contributors
     * @return _goalReached Whether goal has been reached
     * @return _timeLeft Time remaining in seconds (0 if deadline passed)
     */

     /**
     * @dev Get contract details
     */
    function getDetails()
        external
        view
        returns (
            uint256 _goal,
            uint256 _deadline,
            uint256 _amountRaised,
            uint256 _contributorCount,
            bool _goalReached,
            uint256 _timeLeft
        )
    {
        _timeLeft = block.timestamp < deadline ? deadline - block.timestamp : 0;

        return (
            goal,
            deadline,
            amountRaised,
            contributorCount,
            goalReached,
            _timeLeft
        );
    }

    /**
     * @dev Get contribution of an address
     */
    function getContribution(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }

     /**
     * @dev Get contract owner
     */
    function getOwner() external view returns (address) {
        return owner;
    }

     /**
     * @dev Check if caller is owner
     */
    function isOwner() external view returns (bool) {
        return msg.sender == owner;
    }

     /**
     * @dev Get all contributors
     */
    function getContributors() external view returns (address[] memory) {
        return contributors;
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}