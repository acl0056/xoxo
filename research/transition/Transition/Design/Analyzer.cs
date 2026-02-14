using Easycoustics.Transition.CircuitEditor;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Design;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Easycoustics.Transition
{
    public class Analyzer
    {
        /* this class is a singleton, (one instance class) */
        public static Analyzer CurrentInstance { get; } = new Analyzer();

        private AnalysisParameters Parameters { get => CurrentDesign.AnalysisParameters; }
        private UserDesign CurrentDesign { get => UserDesign.CurrentDesign; }

        private readonly List<ElectricNode> ElectricNodes = new List<ElectricNode>();
        private ElectricNode GroundNode = new ElectricNode() { IsGroundNode = true, NodeNumber = 0 };

        private IEnumerable<SerializableComponent> Components => UserDesign.CurrentDesign.Components;
        private CurveLibrary.LibraryFolder SystemCurves => UserDesign.CurrentDesign.SystemCurves;

        private readonly List<Circuit> Circuits = new List<Circuit>();

      //  private Dictionary<Circuit, Common.Matrix> MatrixDict = new Dictionary<Circuit, Common.Matrix>();
     //   private Dictionary<Circuit, Common.Matrix> CVDict = new Dictionary<Circuit, Common.Matrix>();
     //   private Dictionary<Circuit, Common.Matrix> ResultDict = new Dictionary<Circuit, Common.Matrix>();
       // private bool CircuitChanged = false;

        private Task<Tuple<bool, string>> CalculateTask;
        public Tuple<bool, string> ResultStatus;

        private List<VoltageOutputNode> VoltageOutputNodes = new List<VoltageOutputNode>();
        private List<VoltageOutputDifferential> VoltageOutputDiffs = new List<VoltageOutputDifferential>();
        private List<IVoltageCurrentOutput> PassivesVoltageCurrOutputs = new List<IVoltageCurrentOutput>();
        private List<Resistor> ResistorPowerOutputs = new List<Resistor>();

        public Queue<Tuple<Action,ICircuitCommand>> CommandQueue = new Queue<Tuple<Action, ICircuitCommand>>();

        private bool semaphoreRed;
        private bool buildState = false;

        public Analyzer()
        {

        }

        private void SetStatusText(string text)
        {
            CircuitEditor.CircuitEditor.currentInstance.SetStatusText(text);
        }

        public void dispatchCommand(Action action, ICircuitCommand command)
        {
            CommandQueue.Enqueue(new Tuple<Action, ICircuitCommand>(action,command));

            handleCommandQueue();
        }

        private void handleCommandQueue()
        {
            if (semaphoreRed) return;

            bool doBuild = false;
            bool doCalculate = false;

            Tuple<Action, ICircuitCommand> tup;

            while (CommandQueue.Count > 0)
            {
                tup = CommandQueue.Dequeue();
                tup.Item1();
                switch (tup.Item2.CommandType)
                {
                    case CommandType.DontCalculate: break;
                    case CommandType.ReBuildAndCalculate: doBuild = true; break;
                    case CommandType.ReCalculate: doCalculate = true; break;
                }
            }

            if (doBuild)
            {
                SetStatusText("Building Circuit...");
                var buildResult = Build();
                SetStatusText(buildResult.Item2);

                if (!buildResult.Item1)
                {
                    buildState = false;
                    return;
                }
                else
                {
                    buildState = true;
                    doCalculate = true;
                }
            }

            if (doCalculate)
                Calculate();
            
        }


        public async void Calculate()
        {

            if (buildState == false) return;

            semaphoreRed = true;
            CalculateTask = Task.Run(Calculate2);

            await CalculateTask;

            var result = CalculateTask.Result;

            if (result.Item1) CurrentDesign.SystemCurves.submitCurvesChange();

            SetStatusText(result.Item2);
            semaphoreRed = false;

            handleCommandQueue();
        }


        private ElectricNode GetComponentTerminalNode(SerializableComponent comp, byte terminal)
        {
          //  if (comp.IsTerminalGrounded(terminal)) return GroundNode;

            return ElectricNodes.Find(node => node.HasComponentTerminal(comp, terminal));
        }
        


        private List<ElectricNode> GetOtherNodesConnectedToThisNode(ElectricNode node)
        {
            var output = new List<ElectricNode>();
            List<byte> otherTerminals;
            ElectricNode node2;

            foreach (var component in node.ConnectedComponentTerminals.Where(tup => !(tup.Item1 is IMeterComponent)))
            {
                otherTerminals = component.Item1.GetOtherTerminals(component.Item2);
                foreach (var other in otherTerminals)
                {
                    node2 = ElectricNodes.Find(node3 => node3.HasComponentTerminal(component.Item1, other));
                    if (node2 != null)
                        if (!output.Contains(node2) && (node2 != node)) output.Add(node2);
                }

                if (component.Item1 is IImplicitGroundedComponent)
                    if (!output.Contains(GroundNode)) output.Add(GroundNode);
            }

            return output;
        }

        private List<ElectricNode> GetOtherNodesConnectedToThisNodeSection(ElectricNode node)
        {
            var output = new List<ElectricNode>();

            List<byte> otherTerminals;
            ElectricNode node2;

            foreach (var component in node.ConnectedComponentTerminals.Where(tup => !(tup.Item1 is IMeterComponent)))
            {
                if (component.Item1 is IIsolateSection)
                    otherTerminals = ((IIsolateSection)component.Item1).getOtherTerminalsIsolated(component.Item2).ToList();
                else
                    otherTerminals = component.Item1.GetOtherTerminals(component.Item2);
                
                foreach (var other in otherTerminals)
                {
                    node2 = ElectricNodes.Find(node3 => node3.HasComponentTerminal(component.Item1, other));
                    if (node2 != null)
                        if (!output.Contains(node2) && (node2 != node)) output.Add(node2);
                }

                if (component.Item1 is IImplicitGroundedComponent)
                    if (component.Item1 is OpAmp)
                    {/* opamp is floating at input, and grounded at output */
                        if (component.Item2 == 2)
                            if (!output.Contains(GroundNode)) output.Add(GroundNode);
                    }
                    else
                            if (!output.Contains(GroundNode)) output.Add(GroundNode);
            }

            return output;

        }

        public Tuple<bool, string> Build()
        {
            ElectricNodes.Clear();

            GroundNode.NodeWires.Clear();
            GroundNode.ConnectedComponentTerminals.Clear();
            //GroundNode.NodeWires.AddRange(GetGroundedWires());

            ElectricNodes.Add(GroundNode);

            ElectricNode newNode;
            ElectricNode node2;
            int nodeNumber = 1;

            foreach (var ground in CurrentDesign.Components.OfType<Ground>())
                GroundNode.UnionComponentTerminals(ground.GetOtherConnectedComponents(0));
            

            foreach (var compTerm in GetAllComponentsTerminals())
            {
                node2 = GetComponentTerminalNode(compTerm.Item1, compTerm.Item2);

                if (node2 == null)
                {
                    /* we build the node */
                    newNode = new ElectricNode() { IsGroundNode = false, NodeNumber = nodeNumber };
                    nodeNumber++;
                    newNode.ConnectedComponentTerminals.AddRange(compTerm.Item1.GetOtherConnectedComponents(compTerm.Item2));
                    ElectricNodes.Add(newNode);
                }
            
            }
            /*
            foreach (var compMeter in CurrentDesign.Components.Where(comp => comp is VoltageOutputDifferential))
            {
                if (compMeter.IsTerminalGrounded(0))
                    GroundNode.ConnectedComponentTerminals.Add(new Tuple<SerializableComponent, byte>(compMeter, 0));
                if (compMeter.IsTerminalGrounded(1))
                    GroundNode.ConnectedComponentTerminals.Add(new Tuple<SerializableComponent, byte>(compMeter, 1));
            }*/


            /* potentiometer cursor obfuscated nodes are eliminated, compterminals of the eliminated node
               are transferred to colliding node */
            foreach (var pot in CurrentDesign.Components.OfType<Potentiometer>())
            {
                if (pot.isCursorObfuscated() != 255)
                {
                    var nodeCursor = GetComponentTerminalNode(pot, 2); /* terminal 2 is the cursor of the pot */
                    var nodeColliding = GetComponentTerminalNode(pot, pot.isCursorObfuscated());

                    if (nodeCursor == nodeColliding)
                    {
                        nodeCursor.ConnectedComponentTerminals.Remove(new Tuple<SerializableComponent, byte>(pot, 2));
                        continue;
                    }

                    if (nodeCursor == GroundNode)
                    {
                        GroundNode.ConnectedComponentTerminals.Remove(new Tuple<SerializableComponent, byte>(pot, 2));
                        GroundNode.UnionComponentTerminals(nodeColliding.ConnectedComponentTerminals);
                        ElectricNodes.Remove(nodeColliding);
                        continue;
                    }

                    if (nodeColliding == GroundNode)
                    {
                        GroundNode.ConnectedComponentTerminals.Remove(new Tuple<SerializableComponent, byte>(pot, 2));
                        GroundNode.UnionComponentTerminals(nodeCursor.ConnectedComponentTerminals);
                        ElectricNodes.Remove(nodeCursor);
                        continue;
                    }

                    nodeCursor.ConnectedComponentTerminals.Remove(new Tuple<SerializableComponent, byte>(pot, 2));
                    nodeColliding.UnionComponentTerminals(nodeCursor.ConnectedComponentTerminals);
                    ElectricNodes.Remove(nodeCursor);

                }
            }


            /*
            foreach (var node in ElectricNodes)
                if (GetOtherNodesConnectedToThisNode(node).Count == 0)
                    node.isIsolatedFromOtherNodes = true;
            */

            Circuits.Clear();

            Circuit currentCircuit;

            foreach (var node in ElectricNodes.Where(node => !node.IsGroundNode))
            {
                currentCircuit = Circuits.Find(circuit => circuit.Nodes.Contains(node));
                if (currentCircuit == null)
                    Circuits.Add(buildCircuit(node));
            }

            CircuitSection currentSection;

            foreach (var circuit in Circuits)
                foreach (var node in circuit.Nodes)
                {
                    currentSection = circuit.Sections.Find(section => section.Nodes.Contains(node));
                    if (currentSection == null)
                        circuit.Sections.Add(buildSection(node));
                }

           
            foreach (var circuit in Circuits)
            {
                foreach (var section in circuit.Sections)
                {
                    circuit.NonReferenceNodes.AddRange(section.Nodes);
                    circuit.NonReferenceNodes.Remove(section.ReferenceNode);
                }
                
                circuit.CurrentMatrix = new Common.Matrix(circuit.NonReferenceNodes.Count);
                circuit.ConstValueMatrix = new Common.Matrix(circuit.NonReferenceNodes.Count, 1);

            }

            /* now all nodes, sections and circuits are built, we do some checks  */
            if (Circuits.Count == 0) return new Tuple<bool, string>(false, "There is no circuit");

            foreach (var circuit in Circuits)
            {
                foreach (var section in circuit.Sections)
                {
                    if (section.HasGroundReferenceVoltageOutput && !section.IsGrounded)
                        return new Tuple<bool, string>(false, "There is a floating section with a grounded voltage output node, use the differential voltage output");
                }

                if (!circuit.HasVoltageSource)
                    return new Tuple<bool, string>(false, "There is a circuit without a Voltage Source, all circuits must have at least one Voltage Source");

            }
            /* check the differential voltage outputs */

            ElectricNode node0;
            ElectricNode node1;

            bool node0Grounded;
            bool node1Grounded;

            VoltageOutputNodes.Clear();
            VoltageOutputDiffs.Clear();
            PassivesVoltageCurrOutputs.Clear();
            ResistorPowerOutputs.Clear();

            VoltageOutputNodes.AddRange(Components.OfType<VoltageOutputNode>());
            VoltageOutputDiffs.AddRange(Components.OfType<VoltageOutputDifferential>());
            PassivesVoltageCurrOutputs.AddRange(Components.OfType<IVoltageCurrentOutput>().Where(o => o.OutputVoltageAcross || o.OutputCurrentThrough));
            ResistorPowerOutputs.AddRange(Components.OfType<Resistor>().Where(res => res.OutputResistorPower));


            foreach (var diff in VoltageOutputDiffs)
            {
                node0 = GetComponentTerminalNode(diff, 0);
                node1 = GetComponentTerminalNode(diff, 1);

                if (node0 == null)
                    return new Tuple<bool, string>(false, "Differential Voltage " + diff.ElementName + " has an unconnected terminal");
                if (node1 == null)
                    return new Tuple<bool, string>(false, "Differential Voltage " + diff.ElementName + " has an unconnected terminal");

                node0Grounded = IsNodeGroundReferenced(node0);
                node1Grounded = IsNodeGroundReferenced(node1);

                if ((!node0Grounded && node1Grounded) || (node0Grounded && !node1Grounded))
                    return new Tuple<bool, string>(false, "Differential Voltage " + diff.ElementName + " has a terminal grounded and the other floating, both terminals must be floating in the same section, or in grounded sections");

                if (!node0Grounded && !node1Grounded)
                {
                    var section1 = GetSectionForNode(node0);
                    var section2 = GetSectionForNode(node1);
                    if (section1 != section2)
                        return new Tuple<bool, string>(false, "Differential Voltage " + diff.ElementName + " has terminals on different floating sections, both terminals must be in the same floating section");
                }

            }


            // var NodeMatrix = new Common.Matrix(QuantityOfNodes);
            /* 
             * inside this matrix we put admittances we solve this matrix along with a vector, 
             as a equation system of currents for getting the voltages at every node.
             admittance is the reciprocal of impedance.
             both admittance and impedance are complex.
             */

            // var CVMatrix = new Common.Matrix(QuantityOfNodes, 1);


            //Common.Matrix nodeVoltages;
            //node 0 is always the ground
            

            SystemCurves.Clear();

            foreach (var outputNode in VoltageOutputNodes)
            {
                outputNode.ResultVoltageCurve.Clear();
                SystemCurves.AddIfNotAdded(outputNode.ResultVoltageCurve);
            }

            foreach (var outputNodeDiff in VoltageOutputDiffs)
            {
                outputNodeDiff.ResultVoltageCurve.Clear();
                SystemCurves.AddIfNotAdded(outputNodeDiff.ResultVoltageCurve);
            }
            
            foreach (var outputVoltCurrComponent in PassivesVoltageCurrOutputs)
            {
                if (outputVoltCurrComponent.OutputVoltageAcross)
                {
                    outputVoltCurrComponent.ResultVoltageCurve.Clear();
                    SystemCurves.AddIfNotAdded(outputVoltCurrComponent.ResultVoltageCurve);
                }

                if (outputVoltCurrComponent.OutputCurrentThrough)
                {
                    outputVoltCurrComponent.ResultCurrentCurve.Clear();
                    SystemCurves.AddIfNotAdded(outputVoltCurrComponent.ResultCurrentCurve);
                }
            }
            

            foreach (var resistor in ResistorPowerOutputs)
            {
                resistor.ResultPowerCurve.Clear();
                SystemCurves.AddIfNotAdded(resistor.ResultPowerCurve);
            }
            
            return new Tuple<bool, string>(true, "Circuit built OK");
        }




        private CircuitSection buildSection(ElectricNode startingNode)
        {
            var output = new CircuitSection();

            Action<ElectricNode> visit = null;
            
            visit = (node) => {
                output.Nodes.Add(node);
                if (node == GroundNode) return;
                foreach (var nextNode in GetOtherNodesConnectedToThisNodeSection(node))
                    if (!output.Nodes.Contains(nextNode)) visit(nextNode);
            };

            visit(startingNode);
            
            return output;
        }


        private Circuit buildCircuit(ElectricNode startingNode)
        {
            var output = new Circuit();

            Action<ElectricNode> visit = null;
            
            visit = (node) => {
                output.Nodes.Add(node);
                if (node == GroundNode) return; /* do not analyze ground node because it can lead to other circuit */
                foreach (var nextNode in GetOtherNodesConnectedToThisNode(node))
                    if (!output.Nodes.Contains(nextNode)) visit(nextNode);
            };

            visit(startingNode);
            
            return output;
        }
        

        public List<Tuple<SerializableComponent, byte>> GetAllComponentsTerminals()
        {
            var output = new List<Tuple<SerializableComponent, byte>>();
            
            foreach (var comp in CurrentDesign.Components.Where(comp => !(comp is IMeterComponent) && !(comp is Ground) ))
                for (byte i = 0; i < comp.QuantityOfTerminals; i++)
                    output.Add(new Tuple<SerializableComponent, byte>(comp, i));
            
            return output;
        }

        public CircuitSection GetSectionForNode(ElectricNode node)
        {
            CircuitSection output;

            foreach (var circuit in Circuits)
            {
                output = circuit.Sections.Find(section => section.Nodes.Contains(node));
                if (output != null) return output;
            }

            return null;
        }

        public Circuit GetCircuitForNode(ElectricNode node)
        {
            return Circuits.Find(circuit => circuit.Nodes.Contains(node));

        }

        public bool IsNodeGroundReferenced(ElectricNode node) => GetSectionForNode(node).IsGrounded;


        private ElectricNode getOtherNodeInPassiveComponent(IPassive component, byte compTerminal)
        {
            var terminals = component.GetImpedanceTerminals;

            byte otherTerminal = (terminals.Item1 == compTerminal) ? terminals.Item2 : terminals.Item1;
            /* some impedances are fixed grounded, cannot be floating, those return 255 as component terminal
             that means connected to the node 0, that is always ground */

            return (otherTerminal == 255) ? GroundNode : GetComponentTerminalNode((SerializableComponent)component, otherTerminal);

        }

        

        private async Task<Tuple<bool, string>> Calculate2()
        {

            ElectricNode node;
            ElectricNode node2;
            ElectricNode nodePositive;
            ElectricNode nodeNegative;
            ElectricNode currentNode;
            int nodePositiveNumber;
            int nodeNegativeNumber;
            ComplexDecimal voltPositive;
            ComplexDecimal voltNegative;
            ComplexDecimal totalVoltage;
            // IPassive passive;
            // ComplexDecimal sourceAdmittance;
            // ComplexDecimal voltage;
            ComplexDecimal[] admittances;
            bool positiveTerminal;
            VoltageSource source;

            CircuitSection currentSection;
            
    
            foreach (var on in VoltageOutputNodes)
                on.ResultVoltageCurve.Clear();

            foreach (var od in VoltageOutputDiffs)
                od.ResultVoltageCurve.Clear();

            foreach (var pvco in PassivesVoltageCurrOutputs)
            {
                if (pvco.OutputVoltageAcross) pvco.ResultVoltageCurve.Clear();
                if (pvco.OutputCurrentThrough) pvco.ResultCurrentCurve.Clear();
            }

            foreach (var res in ResistorPowerOutputs)
                res.ResultPowerCurve.Clear();

            var freqPoints = UserDesign.CurrentDesign.getFrequencyPoints();
            foreach (var FreqPoint in freqPoints)
            {
                foreach (var circuit in Circuits)
                {
                    /* circuit is solved for each frequency point */
                    circuit.CurrentMatrix.Clear();
                    circuit.ConstValueMatrix.Clear();
                    
                    /* here we populate the node matrix */
                    for (int nodeNumber = 0; nodeNumber < circuit.NonReferenceNodes.Count; nodeNumber++)
                    {
                        currentNode = circuit.NonReferenceNodes[nodeNumber];
                        //currentSection = GetSectionForNode(circuit.NonReferenceNodes[nodeNumber]);

                        foreach (var componentTerminal in currentNode.ConnectedComponentTerminals)
                        {
                            admittances = componentTerminal.Item1.GetAdmittancesForTerminal(componentTerminal.Item2, FreqPoint);

                            for (byte z = 0; z < admittances.Count(); z++)
                            {
                                node = GetComponentTerminalNode(componentTerminal.Item1, z);
                                if (node!=null)
                                    if (node != GetSectionForNode(node).ReferenceNode)
                                        circuit.CurrentMatrix.addAtCoordinate(nodeNumber, circuit.NonReferenceNodes.IndexOf(node), admittances[z]);
                            }
                        
                            if (componentTerminal.Item1 is VoltageSource)
                            {
                                source = (VoltageSource)componentTerminal.Item1;
                              
                                positiveTerminal = (componentTerminal.Item2 == source.PositiveTerminal);
                               
                                circuit.ConstValueMatrix.addAtCoordinate(nodeNumber, 0, source.getSourceVoltage(FreqPoint) * source.getSourceImpedance(FreqPoint).Reciprocal * (positiveTerminal ? 1 : -1));
                                 
                            }
                        }
                    }

                    try
                    {
                        circuit.VoltageResultMatrix = circuit.CurrentMatrix.Solve(circuit.ConstValueMatrix);
                        // ResultDict[circuit] = MatrixDict[circuit].Solve(CVDict[circuit]);
                    }
                    catch (Exception e)
                    {
                        return new Tuple<bool, string>(false, "Voltage Matrix solving failed: " + Environment.NewLine + e.ToString());
                    }
                }

                foreach (var nodeV in VoltageOutputNodes)
                {
                    node2 = GetComponentTerminalNode(nodeV, 0);

                    if (node2 != null)
                        if (node2 != GroundNode)
                        {
                            var circuit = GetCircuitForNode(node2);
                            nodeV.ResultVoltageCurve.addSample(FreqPoint, circuit.VoltageResultMatrix.Data[circuit.NonReferenceNodes.IndexOf(node2), 0]);
                        }
                        else
                            nodeV.ResultVoltageCurve.addSample(FreqPoint, 0);
                }

                foreach (var nodeVD in VoltageOutputDiffs)
                {
                    nodePositive = GetComponentTerminalNode(nodeVD, 0);
                    nodeNegative = GetComponentTerminalNode(nodeVD, 1);

                    if (nodePositive != GroundNode)
                    {
                        var circPos = GetCircuitForNode(nodePositive);
                        nodePositiveNumber = circPos.NonReferenceNodes.IndexOf(nodePositive);
                        voltPositive = (nodePositive != GetSectionForNode(nodePositive).ReferenceNode) ? circPos.VoltageResultMatrix.Data[nodePositiveNumber, 0] : 0;
                    }
                    else
                        voltPositive = 0;

                    if (nodeNegative != GroundNode)
                    {
                        var circNeg = GetCircuitForNode(nodeNegative);
                        nodeNegativeNumber = circNeg.NonReferenceNodes.IndexOf(nodeNegative);
                        voltNegative = (nodeNegative != GetSectionForNode(nodeNegative).ReferenceNode) ? circNeg.VoltageResultMatrix.Data[nodeNegativeNumber, 0] : 0;
                    }
                    else
                        voltNegative = 0;

                    totalVoltage = voltPositive - voltNegative;

                    nodeVD.ResultVoltageCurve.addSample(FreqPoint, totalVoltage);
                    
                }

                foreach (var comp in PassivesVoltageCurrOutputs)
                {
                    nodePositive = GetComponentTerminalNode((SerializableComponent)comp, 0);
                    nodeNegative = GetComponentTerminalNode((SerializableComponent)comp, 1);

                    Circuit circuit;
                    CircuitSection section;

                    if (nodePositive == GroundNode && nodeNegative == GroundNode)
                    {
                        comp.ResultVoltageCurve.addSample(FreqPoint, 0);
                        continue;
                    }

                    if (nodePositive == nodeNegative)
                    {
                        comp.ResultVoltageCurve.addSample(FreqPoint, 0);
                        continue;
                    }

                    if (nodePositive != GroundNode)
                    {
                        circuit = GetCircuitForNode(nodePositive);
                        section = GetSectionForNode(nodePositive);
                    }
                    else
                    {
                        circuit = GetCircuitForNode(nodeNegative);
                        section = GetSectionForNode(nodeNegative);
                    }

                    if (nodePositive != null && nodeNegative != null)
                    {
                        nodePositiveNumber = circuit.NonReferenceNodes.IndexOf(nodePositive);
                        nodeNegativeNumber = circuit.NonReferenceNodes.IndexOf(nodeNegative);

                        voltPositive = (nodePositive != section.ReferenceNode) ? circuit.VoltageResultMatrix.Data[nodePositiveNumber, 0] : 0;
                        voltNegative = (nodeNegative != section.ReferenceNode) ? circuit.VoltageResultMatrix.Data[nodeNegativeNumber, 0] : 0;

                        totalVoltage = voltPositive - voltNegative;

                        if (comp.OutputVoltageAcross)
                            comp.ResultVoltageCurve.addSample(FreqPoint, totalVoltage);

                        if (comp.OutputCurrentThrough)
                            comp.ResultCurrentCurve.addSample(FreqPoint, totalVoltage / comp.GetImpedance(FreqPoint));
                        
                    }
                }
                
            }
               
            return new Tuple<bool, string>(true, "Circuit solved OK");
          

        }
          
    }



    public class ElectricNode
    {
        public int NodeNumber;
        public List<Tuple<SerializableComponent, byte>> ConnectedComponentTerminals = new List<Tuple<SerializableComponent, byte>>();
        public List<SerializableWire> NodeWires = new List<SerializableWire>();
       // public bool isIsolatedFromOtherNodes;
        public bool IsGroundNode;

        public bool HasGroundReferenceVoltageOutput => MeterComponents.Where(comp => comp is VoltageOutputNode).Count() > 0;

        public bool IsEssential { get => NonMeterComponents.Count > 2; }

        public bool HasNoComponentsConnected { get => NonMeterComponents.Count > 0; }
        public bool HasVoltageSource { get => NonMeterComponents.Where(comp => comp is VoltageSource).Count() > 0; }

        public List<SerializableComponent> NonMeterComponents => 
            ConnectedComponentTerminals.Select(tup => tup.Item1).Where(comp => !(comp is IMeterComponent)).ToList();

        public List<SerializableComponent> MeterComponents =>
            ConnectedComponentTerminals.Select(tup => tup.Item1).Where(comp => (comp is IMeterComponent)).ToList();

        public bool HasComponentTerminal(SerializableComponent comp, byte terminal)
        {
            var tuple = new Tuple<SerializableComponent, byte>(comp, terminal);
            return ConnectedComponentTerminals.Contains(tuple);
        }

        public bool HasComponent(SerializableComponent comp)
        {
            return ConnectedComponentTerminals.Select(tup => tup.Item1).Contains(comp);
        }

        public void UnionComponentTerminals(List<Tuple<SerializableComponent, byte>> otherList)
        {
            ConnectedComponentTerminals = ConnectedComponentTerminals.Union(otherList).ToList();
        }

        public override string ToString()
        {
            if (IsGroundNode) return "Ground Node"; else
            return "Node " + NodeNumber.ToString();
        }
    }



    public class Circuit
    {
        public List<CircuitSection> Sections { get; } = new List<CircuitSection>();   

        public Matrix CurrentMatrix { get; set; }
        public Matrix ConstValueMatrix { get; set; }
        public Matrix VoltageResultMatrix { get; set; }

        public CircuitMode CircuitMode { get {
                int quantityFloating = 0;
                int quantityGrounded = 0;
                foreach (var section in Sections)
                {
                    if (section.IsGrounded) quantityGrounded++;
                    else quantityFloating++;
                }

                if (quantityFloating > 0 && quantityGrounded == 0) return CircuitMode.Floating;
                else
                    if (quantityFloating == 0 && quantityGrounded > 0) return CircuitMode.Grounded;
                else
                    return CircuitMode.Mixed;

            } }

        public List<ElectricNode> Nodes { get; } = new List<ElectricNode>();
        public List<ElectricNode> NonReferenceNodes { get; } = new List<ElectricNode>();

        public bool IsReferenceNode(ElectricNode node)
        {
            return !NonReferenceNodes.Contains(node);
        }

        public override string ToString()
        {
            return "Circuit, Mode: " + this.CircuitMode.ToString() + ", " + Sections.Count.ToString() + " Sections, " + Nodes.Count.ToString() + " Nodes";
        }

        public bool HasVoltageSource => Nodes.Find(node => node.NonMeterComponents.Find(comp => comp is VoltageSource) != null) != null;
        
    }



    public class CircuitSection
    {
        public List<ElectricNode> Nodes { get; } = new List<ElectricNode>();
        public bool IsGrounded => Nodes.Where(node => node.IsGroundNode).Count() > 0;
        public ElectricNode GroundNode => Nodes.Find(node => node.IsGroundNode);
        
        public ElectricNode ReferenceNode => IsGrounded ? GroundNode : Nodes.First();

        public override string ToString()
        {
            return "Circuit section: " + Nodes.Count.ToString() + " nodes, " +
                (IsGrounded ? "Grounded" : "Floating");
        }

        

        public bool HasGroundReferenceVoltageOutput => Nodes.Where(node => node.HasGroundReferenceVoltageOutput).Count() > 0;


    }
    
}
