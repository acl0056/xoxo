using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Numerics;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.CustomControls;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;
using Easycoustics.Transition.Common;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor.Components
{
    public sealed partial class PotentiometerParametersControl : UserControl
    { 
        private Potentiometer SerializablePotentiometer { get; }

        //private SeriesCollection seriesCollection;

        private string oldElementName;

        public PotentiometerParametersControl()
        {
            this.InitializeComponent();
        }

        public PotentiometerParametersControl(Potentiometer pot)
        {
            this.InitializeComponent();

            SerializablePotentiometer = pot;

            pot.PropertyChanged += handleChangeOfControls;
            handleChangeOfControls(null, null);

          /*  seriesCollection = new SeriesCollection();
            lvcTaperCurve.Series = seriesCollection;

            lvcTaperCurve.AxisX.Add(new Axis()
            {
                Title = "Rotation (%)",
                MinValue = 0,
                MaxValue = 100,
                Separator = new Separator()
                {
                    Step = 25,
                    Stroke = new SolidColorBrush(Colors.Gray),
                    StrokeThickness = .5
                }
            });

            lvcTaperCurve.AxisY.Add(new Axis()
            {
                Title = "Resistance (%)",
                MinValue = 0,
                MaxValue = 100,
                Separator = new Separator()
                {
                    Step = 25,
                    Stroke = new SolidColorBrush(Colors.LightGray),
                    StrokeThickness = .5
                }
            });
            */
            pot.TaperChanged += Pot_TaperChanged;

            Pot_TaperChanged();

        }

        private void Pot_TaperChanged()
        {/*
            seriesCollection.Clear();

            LineSeries l = new LineSeries()
            {
                Values = new ChartValues<ObservablePoint>(),
                PointGeometrySize = 5,
                StrokeThickness = 2,
                Stroke = new SolidColorBrush(Colors.Black),
                LineSmoothness = 0
            };
         
            foreach (KeyValuePair<decimal, ComplexDecimal> point in SerializablePotentiometer.TaperFunction.Data)
                  l.Values.Add(new ObservablePoint(Convert.ToDouble(point.Key),
                       Convert.ToDouble(point.Value.Magnitude)));

            seriesCollection.Add(l);
            */
             
        }

        private void ClickCCW(object sender, RoutedEventArgs e)
        {
            sldPosition.Value = 0;
        }

        private void ClickCenter(object sender, RoutedEventArgs e)
        {
            sldPosition.Value = 50;
        }

        private void ClickCW(object sender, RoutedEventArgs e)
        {
            sldPosition.Value = 100;
        }

        private void cmbSelectedQuantityOfTerminalsChanged(object sender, SelectionChangedEventArgs e)
        {
            byte newQuantity;

            switch (cmbQuantityOfTerminals.SelectedIndex)
            {
                case 0: newQuantity = 3; break;
                case 1: newQuantity = 4; break;
                case 2: newQuantity = 5; break;
                case 3: newQuantity = 6; break;
                default: newQuantity = 3; break;
            }

            var command = new CommandSetValue()
            {
                Component = SerializablePotentiometer,
                Property = "QuantityOfTerminals",
                OldValue = SerializablePotentiometer.QuantityOfTerminals,
                NewValue = newQuantity,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);
        }



        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializablePotentiometer.PropertyChanged -= handleChangeOfControls;

            cmbQuantityOfTerminals.SelectionChanged -= cmbSelectedQuantityOfTerminalsChanged;
            switch (SerializablePotentiometer.QuantityOfTerminals)
            {
                case 3: cmbQuantityOfTerminals.SelectedIndex = 0; break;
                case 4: cmbQuantityOfTerminals.SelectedIndex = 1; break;
                case 5: cmbQuantityOfTerminals.SelectedIndex = 2; break;
                case 6: cmbQuantityOfTerminals.SelectedIndex = 3; break;
            }
            cmbQuantityOfTerminals.SelectionChanged += cmbSelectedQuantityOfTerminalsChanged;
            
            componentValueBox.ValueChanged -= PotValueChanged;
            componentValueBox.ComponentValue = SerializablePotentiometer.ResistanceValue;
            componentValueBox.ValueChanged += PotValueChanged;

            componentValueBox.PrecisionChanged -= PrecisionChanged;
            componentValueBox.ComponentPrecision = SerializablePotentiometer.ComponentPrecision;
            componentValueBox.PrecisionChanged += PrecisionChanged;

            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializablePotentiometer.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            sldTapAPosition.ValueChanged -= sldTapAPositionValueChanged;
            sldTapBPosition.ValueChanged -= sldTapBPositionValueChanged;
            sldTapCPosition.ValueChanged -= sldTapCPositionValueChanged;

            switch (SerializablePotentiometer.QuantityOfTerminals)
            {
                case 3:
                    cmbQuantityOfTerminals.SelectedIndex = 0;
                    sldTapAPosition.IsEnabled = false;
                    sldTapBPosition.IsEnabled = false;
                    sldTapCPosition.IsEnabled = false;
                    break;
                case 4:
                    cmbQuantityOfTerminals.SelectedIndex = 1;
                    sldTapAPosition.IsEnabled = false;
                    sldTapBPosition.IsEnabled = true;
                    sldTapCPosition.IsEnabled = false;
                    break;
                case 5:
                    cmbQuantityOfTerminals.SelectedIndex = 2;
                    sldTapAPosition.IsEnabled = true;
                    sldTapBPosition.IsEnabled = false;
                    sldTapCPosition.IsEnabled = true;
                    break;
                case 6:
                    cmbQuantityOfTerminals.SelectedIndex = 3;
                    sldTapAPosition.IsEnabled = true;
                    sldTapBPosition.IsEnabled = true;
                    sldTapCPosition.IsEnabled = true;
                    break;
            }

            sldTapAPosition.Value = SerializablePotentiometer.TapAPositionValue;
            sldTapBPosition.Value = SerializablePotentiometer.TapBPositionValue;
            sldTapCPosition.Value = SerializablePotentiometer.TapCPositionValue;
            
            sldTapAPosition.ValueChanged += sldTapAPositionValueChanged;
            sldTapBPosition.ValueChanged += sldTapBPositionValueChanged;
            sldTapCPosition.ValueChanged += sldTapCPositionValueChanged;

            sldPosition.ValueChanged -= sldPositionValueChanged;
            sldPosition.Value = SerializablePotentiometer.CursorPositionValue;
            sldPosition.ValueChanged += sldPositionValueChanged;

            SerializablePotentiometer.PropertyChanged += handleChangeOfControls;
        }
        

        private void PrecisionChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializablePotentiometer,
                Property = "ComponentPrecision",
                OldValue = args.oldValue,
                NewValue = args.newValue,
                CommandType = CommandType.DontCalculate
            };

            executeCommand(command);

        }

        private void PotValueChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializablePotentiometer,
                Property = "ResistanceValue",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);

        }

        private void sldPositionValueChanged(object sender, RangeBaseValueChangedEventArgs e)
        {
            
            bool isCursorObfuscated = SerializablePotentiometer.isCursorObfuscated() != 255;
            bool willBeObfuscated = SerializablePotentiometer.cursorWillBeObfuscated(sldPosition.Value) != 255;
            
            CommandType commType = (isCursorObfuscated ^ willBeObfuscated) ? CommandType.ReBuildAndCalculate : CommandType.ReCalculate;

            if (commType == CommandType.ReBuildAndCalculate)
                System.Diagnostics.Debug.WriteLine("Pot summoned rebuild!");

            var command = new CommandSetValue()
            {
                Component = SerializablePotentiometer,
                Property = "PositionValue",
                OldValue = SerializablePotentiometer.CursorPositionValue,
                NewValue = sldPosition.Value,
                CommandType = commType
            };

            executeCommand(command);

        }

        private void sldTapAPositionValueChanged(object sender, RangeBaseValueChangedEventArgs e)
        {

            var command = new CommandSetValue()
            {
                Component = SerializablePotentiometer,
                Property = "TapAPositionValue",
                OldValue = SerializablePotentiometer.TapAPositionValue,
                NewValue = sldTapAPosition.Value
            };

            executeCommand(command);

        }

        private void sldTapBPositionValueChanged(object sender, RangeBaseValueChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializablePotentiometer,
                Property = "TapBPositionValue",
                OldValue = SerializablePotentiometer.TapBPositionValue,
                NewValue = sldTapBPosition.Value
            };

            executeCommand(command);

        }

        private void sldTapCPositionValueChanged(object sender, RangeBaseValueChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializablePotentiometer,
                Property = "TapCPositionValue",
                OldValue = SerializablePotentiometer.TapCPositionValue,
                NewValue = sldTapCPosition.Value
            };

            executeCommand(command);

        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializablePotentiometer,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;

        }

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializablePotentiometer.ElementName;
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }

        private void btnLibraryTap(object sender, TappedRoutedEventArgs e)
        {

        }
    }
}
