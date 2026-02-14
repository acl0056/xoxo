using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Windows.UI;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Shapes;

namespace Easycoustics.Transition.Design
{
    public class UserDesign
    {
        /* the UserDesign class stores all circuit information, components, 
         * component parameters, wires and the bounds between them. Also it handles
         * the Canvas where the Design is drawn, and has the responsability for drawing 
         * the circuit on this canvas. This allows the UserDesign class to show a circuit 
         * on screen. This is useful for showing circuit examples on different UI dialogs
         * (and not only to draw the circuit that is being edited by the user in CircuitEditor)
         * On the other hand the CircuitEditor has all operations for manipulating
         * the design, to add components, wires, move and link them.
         * That means there is a strong coupling between UserDesign and CircuitEditor */

        public static UserDesign CurrentDesign { get; set; }

        public GraphParameters CurveGraphParameters { get; set; } = new GraphParameters();
        public AnalysisParameters AnalysisParameters { get; set; } = new AnalysisParameters();

        public ObservableCollection<SerializableComponent> Components { get; } = new ObservableCollection<SerializableComponent>();
        public ObservableCollection<SerializableWire> Wires { get; } = new ObservableCollection<SerializableWire>();

        public ObservableCollection<ScreenComponentBase> ScreenComponents { get; } = new ObservableCollection<ScreenComponentBase>();
        public ObservableCollection<WireScreen> ScreenWires { get; } = new ObservableCollection<WireScreen>();

    

        public delegate void ElementDelegate(UserDesign sender, SerializableElement element);
        public event ElementDelegate ElementAdded;
        public event ElementDelegate ElementRemoved;

       
        public SchematicParameters CircuitSchematicParameters { get; set; } = new SchematicParameters();
      
        public CurveLibrary.LibraryFolder SystemCurves = new CurveLibrary.LibraryFolder("Design Result Curves");
        public CurveLibrary.LibraryFolder UserCurves = new CurveLibrary.LibraryFolder("User Curves");

        public double RadiusNear => 15;

        public Canvas CanvasCircuit { get; } = new Canvas()
        {
            Background = new SolidColorBrush(Colors.Transparent),
            HorizontalAlignment = HorizontalAlignment.Stretch,
            VerticalAlignment = VerticalAlignment.Stretch,
            Width = 1080,
            Height = 720,
            AllowDrop = true
        };

        public bool SnapToGrid { get; set; } = true;


        public UserDesign()
        {
           

            Components.CollectionChanged += Components_CollectionChanged;
            Wires.CollectionChanged += Wires_CollectionChanged;
        }

        private void Components_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            switch (e.Action)
            {
                case NotifyCollectionChangedAction.Add:
                    foreach (SerializableComponent component in e.NewItems)
                    {
                        CanvasCircuit.Children.Add(component.OnScreenElement);
                        ScreenComponents.Add((ScreenComponentBase)component.OnScreenElement);
                        ElementAdded?.Invoke(this, component);
                    }
                    break;

                case NotifyCollectionChangedAction.Remove:
                    foreach (SerializableComponent component in e.OldItems)
                    {
                        component.deletedElement();
                        CanvasCircuit.Children.Remove(component.OnScreenElement);
                        ScreenComponents.Remove((ScreenComponentBase)component.OnScreenElement);
                        ElementRemoved?.Invoke(this, component);
                    }
                    break;
            }

        }

        private void Wires_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            switch (e.Action)
            {
                case NotifyCollectionChangedAction.Add:
                    foreach (SerializableWire wire in e.NewItems)
                    {
                        CanvasCircuit.Children.Add(wire.OnScreenWire);
                        ScreenWires.Add(wire.OnScreenWire);
                        ElementAdded?.Invoke(this, wire);
                    };
                    break;
                case NotifyCollectionChangedAction.Remove:
                    foreach (SerializableWire wire in e.OldItems)
                    {
                        wire.deletedElement();
                        CanvasCircuit.Children.Remove(wire.OnScreenWire);
                        ScreenWires.Remove(wire.OnScreenWire);
                        ElementRemoved?.Invoke(this, wire);
                    }
                    break;
            }
        }


        public void removeElement(SerializableElement element)
        {
            if (element is SerializableComponent) Components.Remove((SerializableComponent)element);
            if (element is SerializableWire) Wires.Remove((SerializableWire)element);
        }

        public List<ICircuitSelectable> getAllSelectable()
        {
            var output = new List<ICircuitSelectable>();

            output.AddRange(ScreenComponents);
            output.AddRange(getAllUnboundedWireTerminals());

            return output;
        }

        public List<ScreenElementBase> getAllScreenElements()
        {
            var output = new List<ScreenElementBase>();
            output.AddRange(ScreenWires);
            output.AddRange(ScreenComponents);

            return output;
        }

        public List<SerializableWire> getBoundedWires(SerializableElement el, byte terminal)
        {
            var output = new List<SerializableWire>();

            foreach (SerializableWire wire in Wires)
                if (wire.isThisWireBoundedTo(el, terminal))
                    output.Add(wire);
            
            return output;
        }


        public SerializableWire bindComponentTerminal(SerializableComponent comp1, byte terminal1, SerializableElement el2, byte terminal2)
        {
            if (areTwoElementsTerminalsBounded(comp1, terminal1, el2, terminal2))
                return null;

            if ((comp1 == el2) && (terminal1 == terminal2)) return null;

            SerializableWire wire = new SerializableWire()
            {
                PositionTerminal0 = new Point2D(40, 40),
                PositionTerminal1 = new Point2D(140, 40)
            };

            wire.Bind0 = new Tuple<SerializableElement, byte>(comp1, terminal1);
            wire.Bind1 = new Tuple<SerializableElement, byte>(el2, terminal2);

            wire.ElementName = "W" + (getMaximumNumberWire() + 1).ToString();

            return wire;
        }

        public bool areTwoElementsTerminalsBounded(SerializableElement el1, byte terminal1, SerializableElement el2, byte terminal2)
        {
            foreach (SerializableWire wire in Wires)
            {
                if (wire.isThisWireBoundedTo(el1, terminal1) &&
                    wire.isThisWireBoundedTo(el2, terminal2))
                    return true;
            }
            return false;
        }


        public ICircuitSelectable getClickedElement(Point2D clickedPoint)
        {
            foreach (WireTerminal wt in getAllUnboundedWireTerminals())
                if (wt.isClicked(clickedPoint)) return wt as ICircuitSelectable;

            foreach (WireTerminal wt in getAllBoundedWireTerminals())
                if (wt.isClicked(clickedPoint)) return wt as ICircuitSelectable;

            foreach (ScreenComponentBase comp in ScreenComponents)
                if (comp.isClicked(clickedPoint)) return comp as ICircuitSelectable;

            foreach (WireScreen wire in ScreenWires)
                if (wire.isClicked(clickedPoint)) return wire as ICircuitSelectable;

            return null;
        }


        public int getMaximumNumberElement(string ElementLetter)
        {
            if (ElementLetter == null) return 0;
            if (ElementLetter == "") return 0;

            int maximum = 0;
            int result;

            foreach (SerializableElement element in Components)
                if (element.ElementName != null)
                    if (element.ElementName.Substring(0, ElementLetter.Length) == ElementLetter)
                        if (int.TryParse(element.ElementName.Substring(ElementLetter.Length, element.ElementName.Length - ElementLetter.Length), out result))
                            if (result > maximum) maximum = result;

            return maximum;
        }

        public int getMaximumNumberWire()
        {
            int result;
            int maximum = 0;

            foreach (SerializableWire wire in Wires)
                if (wire.ElementName != null)
                    if (wire.ElementName.Substring(0, 1) == "W")
                        if (int.TryParse(wire.ElementName.Substring(1, wire.ElementName.Length - 1), out result))
                            if (result > maximum) maximum = result;

            return maximum;
        }

        public int getNextNumberLetter(string ElementLetter)
        {
            return getMaximumNumberElement(ElementLetter) + 1;
        }

        public List<ElementTerminal> getAllTerminals()
        {
            var output = new List<ElementTerminal>();
            foreach (WireScreen wire in ScreenWires)
            {
                output.Add(wire.Terminals[0]);
                output.Add(wire.Terminals[1]);
            }

            foreach (ScreenComponentBase comp in ScreenComponents)
                foreach (ElementTerminal t in comp.Terminals)
                    output.Add(t);

            return output;
        }

        public List<ElementTerminal> getAllComponentTerminals()
        {
            var output = new List<ElementTerminal>();

            foreach (ScreenComponentBase comp in ScreenComponents)
                foreach (ElementTerminal t in comp.Terminals)
                    output.Add(t);

            return output;
        }

        public List<WireTerminal> getAllWireTerminals()
        {
            var output = new List<WireTerminal>();
            foreach (WireScreen wire in ScreenWires)
            {
                output.Add(wire.Terminals[0] as WireTerminal);
                output.Add(wire.Terminals[1] as WireTerminal);
            }

            return output;
        }

        public List<WireTerminal> getAllUnboundedWireTerminals()
        {
            var output = new List<WireTerminal>();
            foreach (WireTerminal wt in getAllWireTerminals())
                if (!wt.isBounded) output.Add(wt);
            return output;
        }

        public List<ElementTerminal> getAllUnboundedWireAndComponentTerminals()
        {
            var output = new List<ElementTerminal>();

            foreach (WireTerminal wt in getAllWireTerminals())
                if (!wt.isBounded) output.Add(wt);

            foreach (ScreenComponentBase comp in ScreenComponents)
                foreach (ElementTerminal t in comp.Terminals)
                    output.Add(t);

            return output;
        }

        public List<WireTerminal> getAllBoundedWireTerminals()
        {
            var output = new List<WireTerminal>();
            foreach (WireTerminal wt in getAllWireTerminals())
                if (wt.isBounded) output.Add(wt);
            return output;
        }

        public List<ICircuitSelectable> enclosingElementsForGroupSelect(Rectangle rect)
        {
            var output = new List<ICircuitSelectable>();

            foreach (ICircuitSelectable element in ScreenComponents.OfType<ICircuitSelectable>())
                if (element.isInside(rect))
                    output.Add(element);

            foreach (ICircuitSelectable element in getAllUnboundedWireTerminals().OfType<ICircuitSelectable>())
                if (element.isInside(rect))
                    output.Add(element);

            return output;
        }

        public ElementTerminal getNearestElementTerminalExcept(Point2D point, ScreenElementBase removedElement)
        {
            /* when user is dragging a wire terminal across the screen
               nearby components or wires terminals are highlighted,
               but we need the dragged terminal not to be highlighted.
               so the dragging wire terminal is the removed element */

            ElementTerminal nearestTerminal = null;
            double nearestDistance = double.MaxValue;

            foreach (var el in getAllScreenElements())
                if (el != removedElement)
                    for (byte i = 0; i < el.QuantityOfTerminals; i++)
                        if ((el.getAbsoluteTerminalPosition(i).getDistance(point) < nearestDistance) &&
                            el.getAbsoluteTerminalPosition(i).getDistance(point) < RadiusNear)
                        {
                            if (el is WireScreen)
                            {
                                WireScreen ws = (WireScreen)el;
                                if (!ws.isTerminalBounded(i))
                                {
                                    nearestTerminal = el.Terminals[i];
                                    nearestDistance = el.getAbsoluteTerminalPosition(i).getDistance(point);
                                }
                            }
                            else
                            {
                                nearestTerminal = el.Terminals[i];
                                nearestDistance = el.getAbsoluteTerminalPosition(i).getDistance(point);
                            }
                        }
            
            return nearestTerminal;
        }

        public List<Tuple<ElementTerminal, ElementTerminal>> getListPairedComponentTerminals()
        {
            var output = new List<Tuple<ElementTerminal, ElementTerminal>>();

            var alreadyAddedTerminals = new List<ElementTerminal>();
            var allTerminals = getAllUnboundedWireAndComponentTerminals();

            foreach (var t1 in allTerminals)
                foreach (var t2 in allTerminals)
                    if (t1.ScreenElement != t2.ScreenElement)
                        if (t1.TerminalPosition.getDistance(t2.TerminalPosition) < RadiusNear)
                            if (!alreadyAddedTerminals.Contains(t1) &&
                                !alreadyAddedTerminals.Contains(t2))
                            {
                                output.Add(new Tuple<ElementTerminal, ElementTerminal>(t1, t2));
                                alreadyAddedTerminals.Add(t1);
                                alreadyAddedTerminals.Add(t2);
                            }

            return output;
        }

        public Dictionary<byte, ElementTerminal> getListPairedComponentTerminals(ScreenComponentBase component)
        {
            var output = new Dictionary<byte, ElementTerminal>();
            var allTerminals = getAllUnboundedWireAndComponentTerminals();

            for (byte i = 0; i < component.QuantityOfTerminals; i++)
                foreach (var t1 in allTerminals)
                    if (t1.ScreenElement != component)
                        if (t1.getAbsoluteTerminalPosition().getDistance(component.getAbsoluteTerminalPosition(i)) < RadiusNear)
                        { if (!areTwoElementsTerminalsBounded(component.SerializableComponent, i, t1.ScreenElement.Serializable, t1.TerminalNumber))
                                output[i] = t1; }

            return output;
        }

        public void lowlightAllTerminalsAllElements()
        {
            foreach (ElementTerminal t in getAllTerminals())
                t.lowlight();
        }

        public IList<SerializableWire> GetAllIndependentWires
        {
            get
            {
                var output = new List<SerializableWire>();
                foreach (var wire in Wires)
                    if (wire.IsIndependent) output.Add(wire);

                return output;
            }
        }


        public List<decimal> getFrequencyPoints()
        {
            return getFrequencyPoints(AnalysisParameters.AnalysisFrequencyScale,
                                      AnalysisParameters.AnalysisMaximumFrequency,
                                      AnalysisParameters.AnalysisMinimumFrequency,
                                      AnalysisParameters.AnalysisQuantityOfFrequencyPoints);
        }



        public static List<decimal> getFrequencyPoints(AxisScale scale, decimal maximumFreq, decimal minimumFreq, uint quantityOfPoints)
        {
            var output = new List<decimal>();

            if (scale == AxisScale.Logarithmic)
            {
                var c = maximumFreq / minimumFreq;
                var pitch = DecimalMath.Power(c, 1 / (quantityOfPoints - 1m));

                for (int x = 0; x < quantityOfPoints; x++)
                    output.Add(minimumFreq * DecimalMath.PowerN(pitch, x));
            }

            if (scale == AxisScale.Linear)
            {
                var pitch = (maximumFreq - minimumFreq) / (quantityOfPoints - 1);

                for (int x = 0; x < quantityOfPoints; x++)
                    output.Add(minimumFreq + x * pitch);
            }

            return output;
        }


    }

}
