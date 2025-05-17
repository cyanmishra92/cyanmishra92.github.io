---
title: Origin - On-Device Reinforcement Learning Framework
description: A system for efficient on-device reinforcement learning that enables edge devices to learn from their environment with minimal energy consumption.
image: /assets/img/projects/origin.jpg
tags: [Reinforcement Learning, Edge AI, On-Device Learning]
---

# Origin - On-Device Reinforcement Learning Framework

## Overview

Origin is a system for efficient on-device reinforcement learning that enables edge devices to learn from their environment with minimal energy consumption. The framework includes novel algorithms for sample-efficient learning and hardware-aware policy optimization.

## Key Features

- **Sample-Efficient Learning**: Algorithms designed to learn from minimal interactions with the environment
- **Hardware-Aware Policy Optimization**: Neural network policies optimized for the target hardware platform
- **Energy-Efficient Exploration**: Smart exploration strategies that minimize energy consumption
- **Adaptive Learning Rates**: Dynamic adjustment of learning parameters based on hardware constraints
- **Distributed Learning Support**: Optional collaboration between edge devices for faster learning

## Technical Details

Origin consists of several components:

1. **Environment Interface**: Standardized API for interacting with the physical or simulated environment
2. **Policy Optimizer**: Hardware-aware reinforcement learning algorithms
3. **Model Compressor**: Techniques to reduce the size and complexity of learned policies
4. **Energy Monitor**: Tools to track and optimize energy consumption during learning
5. **Deployment Manager**: Seamless transition from learning to deployment of optimized policies

## Results

Our evaluations show that Origin can reduce the energy consumption of reinforcement learning by up to 60% compared to traditional approaches, while achieving comparable or better performance. The framework has been tested on various edge devices and applications, including robotics, IoT systems, and autonomous navigation.

## Publications

- **Origin: On-Device Reinforcement Learning Framework for Edge Intelligence**  
  Cyan S. Mishra, Vijaykrishnan Narayanan  
  *International Conference on Learning Representations (ICLR), 2025*

## Future Work

We are currently extending Origin to support:

- Multi-agent reinforcement learning scenarios
- Integration with federated learning frameworks
- More sophisticated reward shaping techniques
- Broader range of reinforcement learning algorithms
